import { describe, expect, it } from "vitest";
import { createCommonContainer } from "@/common/infrastructure/container";
import { createFinanceContainer } from "./container";

describe("createFinanceContainer", () => {
  it("allSources 에 curated·ontong-finance 가 등록된다", () => {
    const common = createCommonContainer();
    try {
      const { allSources } = createFinanceContainer(common);
      expect(allSources.map((s) => s.id)).toEqual(["curated", "ontong-finance"]);
      expect(allSources.find((s) => s.id === "curated")?.checkAvailability().available).toBe(true);
      expect(allSources.find((s) => s.id === "ontong-finance")?.checkAvailability().available).toBe(false);
    } finally {
      common.close();
    }
  });
});
