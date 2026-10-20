import Link from "next/link";
import { HOUSING_BASE } from "../routes";
import { buildQuery, type RawSearchParams } from "../search-params";

export function Pagination(props: { page: number; totalPages: number; raw: RawSearchParams }) {
  const { page, totalPages, raw } = props;
  if (totalPages <= 1) return null;

  const window = 2;
  const pages: number[] = [];
  for (let p = Math.max(1, page - window); p <= Math.min(totalPages, page + window); p++) pages.push(p);
  const href = (p: number) => `${HOUSING_BASE}${buildQuery(raw, { page: p === 1 ? undefined : p })}`;

  return (
    <nav className="pagination" aria-label="페이지">
      {page > 1 && <Link href={href(page - 1)}>이전</Link>}
      {pages[0]! > 1 && <Link href={href(1)}>1</Link>}
      {pages[0]! > 2 && <span>…</span>}
      {pages.map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={p === page ? "current" : undefined}>
          {p}
        </Link>
      ))}
      {pages[pages.length - 1]! < totalPages - 1 && <span>…</span>}
      {pages[pages.length - 1]! < totalPages && <Link href={href(totalPages)}>{totalPages}</Link>}
      {page < totalPages && <Link href={href(page + 1)}>다음</Link>}
    </nav>
  );
}
