import { describe, expect, it } from "vitest";
import {
  FeatureFlags,
  UnknownFeatureError,
  type FeatureDefinition,
  type FeatureFlagStore,
} from "./feature-flags";
import { silentLogger, type Clock } from "./system";

class MemoryStore implements FeatureFlagStore {
  data: Record<string, boolean> = {};
  failReads = false;
  async getOverrides() {
    if (this.failReads) throw new Error("DB 장애");
    return { ...this.data };
  }
  async setOverride(id: string, enabled: boolean) {
    this.data[id] = enabled;
  }
  async clearOverride(id: string) {
    delete this.data[id];
  }
}

const clock: Clock = { now: () => new Date("2026-10-18T00:00:00Z") };
const defs: FeatureDefinition[] = [
  { id: "housing", defaultEnabled: true },
  { id: "jobs", defaultEnabled: false },
];

function setup() {
  const store = new MemoryStore();
  return { store, flags: new FeatureFlags(defs, store, clock, silentLogger) };
}

describe("FeatureFlags", () => {
  it("저장된 값이 없으면 코드의 기본값을 쓴다", async () => {
    const { flags } = setup();
    expect(await flags.list()).toEqual([
      { id: "housing", enabled: true, defaultEnabled: true, overridden: false },
      { id: "jobs", enabled: false, defaultEnabled: false, overridden: false },
    ]);
  });

  it("운영자가 바꾼 값이 기본값보다 우선하고, reset 하면 기본값으로 돌아온다", async () => {
    const { flags } = setup();
    await flags.set("housing", false);
    await flags.set("jobs", true);

    expect(await flags.isEnabled("housing")).toBe(false);
    expect(await flags.isEnabled("jobs")).toBe(true);
    expect((await flags.list())[0]).toMatchObject({ enabled: false, overridden: true });

    await flags.reset("housing");
    expect(await flags.isEnabled("housing")).toBe(true);
    expect((await flags.list())[0]).toMatchObject({ overridden: false });
  });

  it("한 서비스를 꺼도 다른 서비스는 그대로다", async () => {
    const { flags } = setup();
    await flags.set("housing", false);
    expect(await flags.isEnabled("jobs")).toBe(false); // 기본값 그대로
    await flags.set("jobs", true);
    await flags.set("housing", false);
    expect(await flags.isEnabled("jobs")).toBe(true);
  });

  it("모르는 서비스: 조회는 꺼짐, 변경은 오류", async () => {
    const { flags } = setup();
    expect(await flags.isEnabled("nope")).toBe(false);
    await expect(flags.set("nope", true)).rejects.toBeInstanceOf(UnknownFeatureError);
    await expect(flags.reset("nope")).rejects.toBeInstanceOf(UnknownFeatureError);
  });

  it("저장소를 읽지 못하면 서비스를 멈추지 않고 기본값으로 동작한다", async () => {
    const { flags, store } = setup();
    await flags.set("housing", false);
    store.failReads = true;

    expect(await flags.isEnabled("housing")).toBe(true); // 기본값
    expect((await flags.list()).every((s) => !s.overridden)).toBe(true);
  });
});
