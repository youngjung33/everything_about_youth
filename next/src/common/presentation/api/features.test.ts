import { describe, expect, it } from "vitest";
import { FeatureFlags, type FeatureFlagStore } from "@/common/application/feature-flags";
import { silentLogger, type Clock } from "@/common/application/system";
import { assertFeatureEnabled, handleGetFeatures } from "./features";

class MemoryStore implements FeatureFlagStore {
  data: Record<string, boolean> = {};
  async getOverrides() {
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
const flags = () =>
  new FeatureFlags(
    [
      { id: "housing", defaultEnabled: true },
      { id: "jobs", defaultEnabled: false },
    ],
    new MemoryStore(),
    clock,
    silentLogger,
  );

describe("GET /api/v1/features", () => {
  it("서비스별 켜짐 여부만 돌려준다 (기본값/운영자 설정 여부 같은 내부 정보는 노출하지 않는다)", async () => {
    const f = flags();
    await f.set("housing", false);

    const { status, body } = await handleGetFeatures(f);

    expect(status).toBe(200);
    expect(body).toEqual({
      features: [
        { id: "housing", enabled: false },
        { id: "jobs", enabled: false },
      ],
    });
  });
});

describe("assertFeatureEnabled", () => {
  it("켜진 서비스는 통과, 꺼진 서비스는 SERVICE_DISABLED(503)를 던진다", async () => {
    const f = flags();
    await expect(assertFeatureEnabled(f, "housing")).resolves.toBeUndefined();

    await f.set("housing", false);
    await expect(assertFeatureEnabled(f, "housing")).rejects.toMatchObject({
      code: "SERVICE_DISABLED",
      message: "이 서비스는 현재 사용할 수 없습니다.",
    });
  });

  it("한 서비스를 꺼도 다른 서비스의 API 는 막히지 않는다", async () => {
    const f = flags();
    await f.set("jobs", true);
    await f.set("housing", false);

    await expect(assertFeatureEnabled(f, "jobs")).resolves.toBeUndefined();
  });
});
