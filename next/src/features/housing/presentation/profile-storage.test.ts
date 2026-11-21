import { describe, expect, it } from "vitest";
import { mergeSavedProfileIntoSearchParams, pickProfileForStorage } from "./profile-storage-utils";

describe("mergeSavedProfileIntoSearchParams", () => {
  it("깨진·빈 저장값은 병합하지 않는다", () => {
    const params = new URLSearchParams("status=open");
    expect(mergeSavedProfileIntoSearchParams(params, {})).toBe(false);
    expect(params.toString()).toBe("status=open");
  });

  it("URL 에 없는 키만 넣고 이미 있는 키는 덮어쓰지 않는다", () => {
    const params = new URLSearchParams("age=30&status=open");
    const changed = mergeSavedProfileIntoSearchParams(params, { age: "29", home: "y", married: "n" });
    expect(changed).toBe(true);
    expect(params.get("age")).toBe("30");
    expect(params.get("home")).toBe("y");
    expect(params.get("married")).toBe("n");
  });
});

describe("pickProfileForStorage", () => {
  it("p=1 제출 URL 에서 프로필 키만 골라낸다", () => {
    const params = new URLSearchParams("p=1&age=29&home=y&sido=서울&q=행복");
    expect(pickProfileForStorage(params)).toEqual({ age: "29", home: "y" });
  });
});