import type { Logger } from "@/common/application/system";

/** 타이머. 테스트에서 시간을 직접 움직이려고 뺐다. */
export interface Timers {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export interface SyncSchedulerDeps {
  /** 수집 간격(ms). 한 번 끝난 뒤 이만큼 있다가 다시 한다. */
  intervalMs: number;
  /** 서버가 뜬 뒤 첫 수집까지 기다리는 시간(ms). 시작 직후의 부하를 피한다. */
  startupDelayMs: number;
  /** 마지막으로 성공한 수집이 끝난 시각. 없으면 null */
  lastSuccessAt(): Promise<Date | null>;
  /** 서비스가 꺼져 있으면 수집하지 않는다. */
  isEnabled(): Promise<boolean>;
  /** 실제 수집. 소스 하나가 실패해도 던지지 않는다(결과에 담긴다). 던지면 로그만 남기고 다음 주기를 기다린다. */
  run(): Promise<void>;
  now(): Date;
  logger: Logger;
  timers: Timers;
}

export type TickResult = "ran" | "busy" | "disabled" | "failed";

/**
 * 공고를 일정 간격으로 자동 수집한다.
 *  - 겹쳐 실행하지 않는다. (수집이 간격보다 오래 걸려도 한 번에 하나만)
 *  - 재시작해도 방금 수집했다면 곧바로 다시 수집하지 않고 남은 시간만큼 기다린다.
 *  - 실패해도 멈추지 않는다. 다음 주기에 다시 시도한다.
 */
export class SyncScheduler {
  private handle: unknown = null;
  private running = false;
  private stopped = true;

  constructor(private readonly deps: SyncSchedulerDeps) {}

  /** 여러 번 불러도 한 번만 시작한다. */
  async start(): Promise<void> {
    if (!this.stopped) return;
    this.stopped = false;
    const delay = await this.initialDelay();
    if (this.stopped) return; // 읽는 사이에 멈췄다
    this.schedule(delay);
  }

  stop(): void {
    this.stopped = true;
    if (this.handle !== null) this.deps.timers.clear(this.handle);
    this.handle = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** 지금 한 번 수집한다. 이미 수집 중이면 아무것도 하지 않는다. */
  async tick(): Promise<TickResult> {
    if (this.running) return "busy";
    this.running = true;
    try {
      if (!(await this.deps.isEnabled())) return "disabled";
      await this.deps.run();
      return "ran";
    } catch (error) {
      this.deps.logger.error("[sync-scheduler] 자동 수집에 실패했습니다.", { error });
      return "failed";
    } finally {
      this.running = false;
    }
  }

  private async initialDelay(): Promise<number> {
    const { intervalMs, startupDelayMs } = this.deps;
    let last: Date | null = null;
    try {
      last = await this.deps.lastSuccessAt();
    } catch (error) {
      this.deps.logger.warn("[sync-scheduler] 마지막 수집 시각을 읽지 못해 바로 시작합니다.", { error });
    }
    if (!last) return startupDelayMs;
    const age = this.deps.now().getTime() - last.getTime();
    return Math.max(startupDelayMs, intervalMs - age);
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.handle = this.deps.timers.set(() => {
      void this.tick().finally(() => this.schedule(this.deps.intervalMs));
    }, delayMs);
  }
}
