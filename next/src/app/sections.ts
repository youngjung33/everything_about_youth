import { HOUSING_BASE } from "@/features/housing/presentation/routes";

export interface Section {
  id: string;
  title: string;
  description: string;
  href: string;
}

/** 사이트의 섹션 목록. 새 섹션(일자리, 금융 등)은 features/<name> 을 만들고 여기에 등록한다. */
export const SECTIONS: Section[] = [
  {
    id: "housing",
    title: "임대주택",
    description: "청년이 신청할 수 있는 임대·분양 공고를 지역, 유형, 금액, 내 조건으로 조회합니다.",
    href: HOUSING_BASE,
  },
  // 아래는 Next 관리자·홈용 예정 섹션(앱 FeatureModule·API 미구현). 자세한 로드맵은 루트 README.
  {
    id: "benefits",
    title: "청년 혜택·정책",
    description: "(예정) 주거·생활비·취업 연계 공공 지원을 모아 보고 마감을 확인합니다.",
    href: "/",
  },
  {
    id: "finance",
    title: "청년 주거·자금",
    description: "(예정) 전세·보증금·청약저축 등 주거 자금 제도 안내(공식 링크·조건 요약).",
    href: "/",
  },
  {
    id: "jobs",
    title: "청년·공공 일자리",
    description: "(예정) 청년·신입·공공 채용 공고를 모아 봅니다.",
    href: "/",
  },
  {
    id: "living",
    title: "이사·생활",
    description: "(예정) 전입신고·확정일자 등 절차 체크리스트와 공식 안내 링크.",
    href: "/",
  },
];
