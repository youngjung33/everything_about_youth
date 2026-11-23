import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "관리자 | 청년의 모든 것",
  description: "데이터 수집·관리자 계정",
};

/** /admin 하위 레이아웃 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}