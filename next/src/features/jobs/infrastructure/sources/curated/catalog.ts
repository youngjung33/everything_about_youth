import type { HireTypeId } from "@/features/jobs/domain/enums";
import type { JobPostingDraft } from "@/features/jobs/domain/job-posting";

export interface CuratedCatalogEntry {
  slug: string;
  title: string;
  organization: string;
  hireTypeId: HireTypeId;
  tags: string[];
  summary: string;
  url: string;
}

/** 큐레이션 catalog — sync `curated` 소스 단일 출처 */
export const CURATED_CATALOG: CuratedCatalogEntry[] = [
  {
    slug: "alio-public",
    title: "알리오 공공기관 채용공고",
    organization: "알리오",
    hireTypeId: "public_corp",
    tags: ["공기업", "알리오"],
    summary:
      "공기업·준정부기관·기타 공공기관의 채용공고를 모아 보는 대표 허브입니다. 직렬·학력·전형일정·필기·면접 안내는 기관별 공고를 확인해야 하며, 청년·신입 여부는 공고 제목·자격 요건을 따릅니다.",
    url: "https://www.alio.go.kr",
  },
  {
    slug: "gosi-go",
    title: "사이버국가고시센터(공무원 채용)",
    organization: "사이버국가고시센터",
    hireTypeId: "public_official",
    tags: ["공무원", "9급"],
    summary:
      "국가직·지방직 공무원 시험 일정, 공고, 응시자격·가산점 안내입니다. 연령 상한·학력·필기·면접 일정은 직급·시험 종류마다 다르므로 해당 연도 공고를 기준으로 확인하세요.",
    url: "https://www.gosi.go.kr",
  },
  {
    slug: "work24-youth",
    title: "고용24 청년 job × job",
    organization: "한국고용정보원",
    hireTypeId: "youth",
    tags: ["청년", "고용24"],
    summary:
      "고용24에서 제공하는 청년 맞춤 채용·취업 지원 정보 허브입니다. 공고 원문·접수기간·기업 정보는 각 공고 및 기업 사이트에서 최종 확인해야 합니다.",
    url: "https://www.work24.go.kr",
  },
  {
    slug: "work24-job-list",
    title: "고용24 채용정보(워크넷)",
    organization: "한국고용정보원",
    hireTypeId: "new_grad",
    tags: ["신입", "채용"],
    summary:
      "민간·공공 채용공고 검색과 지역·직종 필터를 제공합니다. 청년·신입은 채용형태·경력 요건 필드로 거를 수 있으나, 지원 자격은 공고 본문으로 반드시 검증하세요.",
    url: "https://www.work.go.kr",
  },
  {
    slug: "nps-hire",
    title: "국민연금공단 채용 안내",
    organization: "국민연금공단",
    hireTypeId: "public_corp",
    tags: ["공기업", "NCS"],
    summary:
      "국민연금공단 신입·경력·NCS 기반 채용 공고입니다. 전형 단계, 가산점, 서류 목록은 공단 공식 채용 페이지 공고를 기준으로 합니다.",
    url: "https://www.nps.or.kr",
  },
  {
    slug: "kwater-hire",
    title: "한국수자원공사 채용",
    organization: "한국수자원공사",
    hireTypeId: "public_corp",
    tags: ["공기업"],
    summary:
      "K-water 신입·경력직 채용 공고와 인턴 선발 안내입니다. 직무·지역·자격증 요건은 매 공고마다 다르므로 상세 URL에서 확인해야 합니다.",
    url: "https://www.kwater.or.kr",
  },
  {
    slug: "youth-intern-portal",
    title: "청년인턴·현장실습 정보(대표)",
    organization: "고용노동부·교육부 연계",
    hireTypeId: "intern",
    tags: ["인턴", "청년"],
    summary:
      "청년인턴·도제·현장실습·취업 연계 프로그램을 한곳에서 찾기 위한 안내 허브입니다. 기간·지원금·선발 인원은 운영 기관·연도별 공고가 다릅니다.",
    url: "https://www.youthcenter.go.kr",
  },
  {
    slug: "local-youth-employ",
    title: "지자체 청년 일자리(대표)",
    organization: "지방자치단체",
    hireTypeId: "youth",
    tags: ["지자체", "청년"],
    summary:
      "시·도·군·구에서 운영하는 청년·신입 채용·일경험·공공근로 사업 안내입니다. 거주지·연령·학력 요건과 지원 방법은 관할 지자체 채용·청년정책 페이지에서 확인하세요.",
    url: "https://www.youthcenter.go.kr",
  },
];

export function curatedDrafts(fetchedAt: string): JobPostingDraft[] {
  return CURATED_CATALOG.map((e) => ({
    title: e.title,
    organization: e.organization,
    hireTypeId: e.hireTypeId,
    tags: e.tags,
    regions: [],
    applicationStart: null,
    applicationEnd: null,
    announcementDate: null,
    summary: e.summary,
    url: e.url,
    sources: [{ source: "curated", externalId: e.slug, url: e.url, raw: e, fetchedAt }],
  }));
}
