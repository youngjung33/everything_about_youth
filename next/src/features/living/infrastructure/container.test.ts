import { describe, expect, it } from "vitest";
import { createCommonContainer } from "@/common/infrastructure/container";
import { createLivingContainer } from "./container";

describe("createLivingContainer", () => {
  it("allSources 에 curated 가 등록된다", () => {
    const common = createCommonContainer();
    try {
      const { allSources } = createLivingContainer(common);
      expect(allSources.map((s) => s.id)).toEqual(["curated"]);
      expect(allSources[0]!.checkAvailability().available).toBe(true);
    } finally {
      common.close();
    }
  });
});
