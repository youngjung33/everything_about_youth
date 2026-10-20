import type { Metadata } from "next";
import Link from "next/link";
import { ProfileStorage } from "@/features/housing/presentation/components/ProfileStorage";
import { HOUSING_BASE, HOUSING_SYNC_ADMIN_PATH } from "@/features/housing/presentation/routes";

export const metadata: Metadata = {
  title: "임대주택 | 청년의 모든 것",
  description: "한국 청년이 신청할 수 있는 임대·분양 공고를 한 곳에서 조회합니다.",
};

export default function HousingLayout({ children }: LayoutProps<"/housing">) {
  return (
    <>
      <ProfileStorage />
      <nav className="section-nav" aria-label="임대주택 메뉴">
        <Link href={HOUSING_BASE}>공고 목록</Link>
        <Link href={HOUSING_SYNC_ADMIN_PATH}>수집 현황</Link>
      </nav>
      {children}
      <footer className="site-footer">
        개인용 1차 버전 · 자격 판정은 일반 기준에 따른 참고용이며, 신청 전 반드시 원문 공고를 확인하세요.
      </footer>
    </>
  );
}
