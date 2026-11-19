import type { Logger } from "@/common/application/system";

/** 타이머. 테스트에서 시간을 직접 움직이려고 뺐다. */
export interface Timers {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export interface SyncSchedulerDeps {
  /** 수집 간격(ms). 한 번 끝난 뒤 이만큼 있다가 다시 한다. */
  intervalMs: number;
  /** 서버 기동 후 첫 수집까지 대기(ms) */
  startupDelayMs: number;
  /** 마지막 성공 수집 종료 시각. 없으면 null */
  lastSuccessAt(): Promise<Date | null>;
  /** 서비스 off 이면 수집하지 않음 */
  isEnabled(): Promise<boolean>;
  /** 실제 수집 실행 */
  run(): Promise<void>;
  now(): Date;
  logger: Logger;
  timers: Timers;
}

/** 수동 tick 결과 */
export type TickResult = "ran" | "busy" | "disabled" | "failed";

/**
 * 청년 혜택 정책을 일정 간격으로 자동 수집한다.
 * 겹쳐 실행하지 않고, 재시작 시 남은 간격을 존중하며, 실패해도 다음 주기에 재시도한다.
 */
export class SyncScheduler {
  private handle: unknown = null;
  private running = false;
  private stopped = true;

  constructor(private readonly deps: SyncSchedulerDeps) {}

  async start(): Promise<void> {
    if (!this.stopped) return;
    this.stopped = false;
    const delay = await this.initialDelay();
    if (this.stopped) return;
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
