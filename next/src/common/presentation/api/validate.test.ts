import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "./errors";
import { parseJsonBody, parseWithSchema } from "./validate";

describe("parseWithSchema", () => {
  it("실패하면 BAD_REQUEST 와 fields details 만 준다", () => {
    const schema = z.object({ refreshToken: z.string().min(1) });
    try {
      parseWithSchema(schema, {});
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toBe("요청이 올바르지 않습니다.");
      expect(err.details?.fields).toEqual([{ field: "refreshToken", issue: "invalid_type" }]);
    }
  });
});

describe("parseJsonBody", () => {
  it("JSON 이 아니면 BAD_REQUEST", async () => {
    const req = new Request("http://x", { method: "POST", body: "not-json" });
    await expect(parseJsonBody(req, z.object({}))).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
