import { describe, expect, it, vi } from "vitest";
import { SyncScheduler, type SyncSchedulerDeps, type Timers } from "./sync-scheduler";

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

class FakeTimers implements Timers {
  now = 0;
  private next = 1;
  private pending = new Map<number, { at: number; callback: () => void }>();

  set(callback: () => void, delayMs: number): unknown {
    const id = this.next++;
    this.pending.set(id, { at: this.now + delayMs, callback });
    return id;
  }
  clear(handle: unknown): void {
    this.pending.delete(handle as number);
  }
  get pendingDelays(): number[] {
    return [...this.pending.values()].map((p) => p.at - this.now);
  }
  async advance(ms: number): Promise<void> {
    const target = this.now + ms;
    for (;;) {
      const due = [...this.pending.entries()].filter(([, p]) => p.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.pending.delete(due[0]);
      this.now = due[1].at;
      due[1].callback();
      await flush();
    }
    this.now = target;
  }
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

const HOUR = 3_600_000;

function setup(overrides: Partial<SyncSchedulerDeps> = {}) {
  const timers = new FakeTimers();
  const run = vi.fn(async () => {});
  const deps: SyncSchedulerDeps = {
    intervalMs: 6 * HOUR,
    startupDelayMs: 30_000,
    lastSuccessAt: async () => null,
    isEnabled: async () => true,
    run,
    now: () => new Date(timers.now),
    logger: silentLogger,
    timers,
    ...overrides,
  };
  return { scheduler: new SyncScheduler(deps), timers, run };
}

describe("benefits SyncScheduler", () => {
  it("수집한 적이 없으면 시작 지연 뒤 첫 수집을 하고, 이후 간격마다 반복한다", async () => {
    const { scheduler, timers, run } = setup();
    await scheduler.start();
    expect(timers.pendingDelays).toEqual([30_000]);

    await timers.advance(29_999);
    expect(run).not.toHaveBeenCalled();
    await timers.advance(1);
    expect(run).toHaveBeenCalledTimes(1);

    await timers.advance(6 * HOUR - 1);
    expect(run).toHaveBeenCalledTimes(1);
    await timers.advance(1);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("tick: run 이 throw 하면 failed 를 돌려주고 running 은 풀린다", async () => {
    const run = vi.fn(async () => {
      throw new Error("boom");
    });
    const { scheduler } = setup({ run });
    expect(await scheduler.tick()).toBe("failed");
    expect(scheduler.isRunning).toBe(false);
    expect(silentLogger.error).toHaveBeenCalled();
  });

  it('status: "failed"', async () => {
    const run = vi.fn(async () => {
      throw new Error("sync failed");
    });
    const { scheduler } = setup({ run });
    expect(await scheduler.tick()).toBe("failed");
  });
});
