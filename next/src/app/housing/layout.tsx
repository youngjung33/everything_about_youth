import type { Metadata } from "next";
import { ProfileStorage } from "@/features/housing/presentation/components/ProfileStorage";
import { HousingSectionNav } from "@/features/housing/presentation/components/HousingSectionNav";

/** 브라우저 탭 제목·설명(Next Metadata). */
export const metadata: Metadata = {
  title: "임대주택 | 청년의 모든 것",
  description: "한국 청년이 신청할 수 있는 임대·분양 공고를 한 곳에서 조회합니다.",
};

/** 임대주택 섹션 공통 레이아웃·메타. */
export default function HousingLayout({ children }: LayoutProps<"/housing">) {
  return (
    <>
      <ProfileStorage />
      <HousingSectionNav />
      {children}
      <footer className="site-footer">
        개인용 1차 버전 · 자격 판정은 참고용입니다. 앱 본문을 확인한 뒤, 필요하면 기관 공고에서 최종 검증하세요.
      </footer>
    </>
  );
}


