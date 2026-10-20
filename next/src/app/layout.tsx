import type { Metadata } from "next";
import Link from "next/link";
import { SECTIONS } from "./sections";
import "./globals.css";

export const metadata: Metadata = {
  title: "청년의 모든 것",
  description: "한국 청년이 이용할 수 있는 정보를 한 곳에서 모아봅니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              청년의 모든 것
            </Link>
            <nav>
              {SECTIONS.map((s) => (
                <Link key={s.id} href={s.href}>
                  {s.title}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
