import type { Logger } from "@/common/application/system";

export interface Timers {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export interface SyncSchedulerDeps {
  intervalMs: number;
  startupDelayMs: number;
  lastSuccessAt(): Promise<Date | null>;
  isEnabled(): Promise<boolean>;
  run(): Promise<void>;
  now(): Date;
  logger: Logger;
  timers: Timers;
}

export type TickResult = "ran" | "busy" | "disabled" | "failed";

/** 채용 공고를 일정 간격으로 자동 수집한다. */
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
