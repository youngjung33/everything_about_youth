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
];
