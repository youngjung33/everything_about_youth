import { describe, expect, it } from "vitest";
import { inferHireTypeFromText } from "./enums";
import { createJobPosting, isSameJobPosting, mergeJobPosting } from "./identity";
import { getJobPostingStatus, type JobPostingDraft } from "./job-posting";

const baseDraft = (over: Partial<JobPostingDraft> = {}): JobPostingDraft => ({
  title: "공기업 신입 채용",
  organization: "한국수자원공사",
  hireTypeId: "public_corp",
  tags: ["신입"],
  regions: [{ sido: "서울", sigungu: "마포구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: null,
  url: "https://example.com/a",
  sources: [{ source: "curated", externalId: "kwater-hire", url: null, raw: {}, fetchedAt: "2026-10-12T00:00:00Z" }],
  ...over,
});

describe("enums", () => {
  it("제목·키워드에서 hireTypeId 를 추론한다", () => {
    expect(inferHireTypeFromText("9급 공무원")).toBe("public_official");
    expect(inferHireTypeFromText("공기업 NCS")).toBe("public_corp");
    expect(inferHireTypeFromText("청년인턴")).toBe("intern");
  });
});

describe("posting status", () => {
  it("접수 상태를 계산한다", () => {
    const p = { applicationStart: "2026-10-10", applicationEnd: "2026-10-20" };
    expect(getJobPostingStatus(p, "2026-10-09")).toBe("upcoming");
    expect(getJobPostingStatus(p, "2026-10-15")).toBe("open");
    expect(getJobPostingStatus(p, "2026-10-21")).toBe("closed");
  });
});

describe("identity", () => {
  it("id 는 j_ 로 시작한다", () => {
    const p = createJobPosting(baseDraft());
    expect(p.id.startsWith("j_")).toBe(true);
  });

  it("같은 소스·externalId 는 mergeKey/id 가 같다", () => {
    const a = createJobPosting(baseDraft());
    const b = createJobPosting(baseDraft({ title: "제목만 다른 동일 catalog" }));
    expect(a.id).toBe(b.id);
    expect(isSameJobPosting(a, b)).toBe(true);
  });

  it("병합 시 태그·지역·소스를 합친다", () => {
    const existing = createJobPosting(baseDraft({ tags: ["a"] }));
    const incoming = createJobPosting(baseDraft({ tags: ["b"], regions: [{ sido: "경기", sigungu: null }] }));
    const merged = mergeJobPosting(existing, incoming);
    expect(merged.id).toBe(existing.id);
    expect(merged.tags.sort()).toEqual(["a", "b"]);
    expect(merged.regions).toHaveLength(2);
  });
});
