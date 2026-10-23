import { describe, expect, it, vi } from "vitest";
import { SyncScheduler, type SyncSchedulerDeps, type Timers } from "./sync-scheduler";

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

/** 시간을 직접 움직이는 타이머 */
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
  /** 시간을 앞으로 보내며 도래한 타이머를 실행한다. */
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

describe("SyncScheduler", () => {
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

  it("방금 수집했다면 재시작해도 남은 시간만큼 기다린다", async () => {
    const { scheduler, timers } = setup({
      lastSuccessAt: async () => new Date(-2 * HOUR), // 2시간 전
    });
    await scheduler.start();
    expect(timers.pendingDelays).toEqual([4 * HOUR]);
    scheduler.stop();
  });

  it("간격이 지난 뒤 재시작하면 시작 지연만 기다리고 수집한다", async () => {
    const { scheduler, timers } = setup({ lastSuccessAt: async () => new Date(-7 * HOUR) });
    await scheduler.start();
    expect(timers.pendingDelays).toEqual([30_000]);
    scheduler.stop();
  });

  it("남은 시간이 시작 지연보다 짧아도 시작 지연은 지킨다", async () => {
    const { scheduler, timers } = setup({ lastSuccessAt: async () => new Date(-(6 * HOUR - 1000)) });
    await scheduler.start();
    expect(timers.pendingDelays).toEqual([30_000]);
    scheduler.stop();
  });

  it("마지막 수집 시각을 읽지 못해도 시작한다", async () => {
    const { scheduler, timers } = setup({
      lastSuccessAt: async () => {
        throw new Error("db");
      },
    });
    await scheduler.start();
    expect(timers.pendingDelays).toEqual([30_000]);
    scheduler.stop();
  });

  it("수집이 오래 걸려도 겹쳐 실행하지 않는다", async () => {
    let release: () => void = () => {};
    const run = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const { scheduler } = setup({ run });

    const first = scheduler.tick();
    expect(scheduler.isRunning).toBe(true);
    expect(await scheduler.tick()).toBe("busy");
    expect(run).toHaveBeenCalledTimes(1);

    release();
    expect(await first).toBe("ran");
    expect(scheduler.isRunning).toBe(false);
  });

  it("서비스가 꺼져 있으면 수집하지 않지만 다음 주기는 계속된다", async () => {
    let enabled = false;
    const { scheduler, timers, run } = setup({ isEnabled: async () => enabled });
    await scheduler.start();

    await timers.advance(30_000);
    expect(run).not.toHaveBeenCalled();

    enabled = true;
    await timers.advance(6 * HOUR);
    expect(run).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("수집이 던져도 멈추지 않고 다음 주기에 다시 한다", async () => {
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(undefined);
    const { scheduler, timers } = setup({ run });
    await scheduler.start();

    await timers.advance(30_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduler.isRunning).toBe(false);
    expect(silentLogger.error).toHaveBeenCalled();

    await timers.advance(6 * HOUR);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("start 는 여러 번 불러도 한 번만 시작하고, stop 하면 더 이상 실행하지 않는다", async () => {
    const { scheduler, timers, run } = setup();
    await scheduler.start();
    await scheduler.start();
    expect(timers.pendingDelays).toHaveLength(1);

    scheduler.stop();
    expect(timers.pendingDelays).toHaveLength(0);
    await timers.advance(100 * HOUR);
    expect(run).not.toHaveBeenCalled();
  });

  it("읽는 도중에 stop 하면 타이머를 걸지 않는다", async () => {
    let resolveLast: (d: Date | null) => void = () => {};
    const { scheduler, timers } = setup({ lastSuccessAt: () => new Promise((r) => (resolveLast = r)) });
    const starting = scheduler.start();
    scheduler.stop();
    resolveLast(null);
    await starting;
    expect(timers.pendingDelays).toHaveLength(0);
  });
});
