import { describe, expect, it } from "vitest";
import { handleHealth } from "./health";

describe("handleHealth", () => {
  it("DB 가 있으면 ready true", () => {
    const result = handleHealth();
    expect(result.body.status).toBe("ok");
    expect(result.body.checks.database).toBe("ok");
    expect(result.body.ready).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body.appEnv).toBeTruthy();
  });
});
