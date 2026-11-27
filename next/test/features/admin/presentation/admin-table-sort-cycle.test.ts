import { describe, expect, it } from "vitest";
import { cycleAdminTableTriSort } from "@/features/admin/presentation/admin-table-sort-cycle";

describe("admin table sort cycle", () => {
  it("비활성 상태에서 두 번째 방향까지 갔다가 세 번째는 비활성", () => {
    const first = (k: string) => (k === "id" ? "desc" : "asc");
    let state = cycleAdminTableTriSort({ active: false }, "id", first);
    expect(state).toEqual({ active: true, key: "id", order: "desc" });

    state = cycleAdminTableTriSort(state, "id", first);
    expect(state).toEqual({ active: true, key: "id", order: "asc" });

    state = cycleAdminTableTriSort(state, "id", first);
    expect(state).toEqual({ active: false });
  });

  it("정렬 중 다른 컬럼 클릭이면 새 컬럼 1차 방향", () => {
    const first = () => "asc" as const;
    const prev = { active: true, key: "loginId", order: "desc" as const };
    const next = cycleAdminTableTriSort(prev, "createdAt", first);
    expect(next).toEqual({ active: true, key: "createdAt", order: "asc" });
  });

  it("1차가 asc이면 2차는 desc", () => {
    let state = cycleAdminTableTriSort({ active: false }, "role", () => "asc");
    state = cycleAdminTableTriSort(state, "role", () => "asc");
    expect(state).toEqual({ active: true, key: "role", order: "desc" });
  });
});