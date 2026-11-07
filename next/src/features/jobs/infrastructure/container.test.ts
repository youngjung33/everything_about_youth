import { describe, expect, it } from "vitest";
import { createCommonContainer } from "@/common/infrastructure/container";
import { createJobsContainer } from "./container";

describe("createJobsContainer", () => {
  it("allSources 에 curated 가 등록된다", () => {
    const common = createCommonContainer();
    try {
      const { allSources } = createJobsContainer(common);
      expect(allSources.map((s) => s.id)).toEqual(["curated"]);
      expect(allSources.find((s) => s.id === "curated")?.checkAvailability().available).toBe(true);
    } finally {
      common.close();
    }
  });
});
