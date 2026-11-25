"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOUSING_BASE, HOUSING_SYNC_ADMIN_PATH } from "../routes";

/** 임대주택 공개 메뉴(관리자 수집 화면에서는 숨김). */
export function HousingSectionNav() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/housing/admin")) return null;

  return (
    <nav className="section-nav" aria-label="임대주택 메뉴">
      <Link href={HOUSING_BASE}>공고 목록</Link>
      <Link href="/admin">관리자</Link>
      <Link href={HOUSING_SYNC_ADMIN_PATH}>수집 현황</Link>
    </nav>
  );
}