import { todayInKst } from "@/common/domain/date";
import { getHousingContainer } from "@/features/housing/infrastructure/container";
import { FilterForm } from "@/features/housing/presentation/components/FilterForm";
import { NoticeCard } from "@/features/housing/presentation/components/NoticeCard";
import { Pagination } from "@/features/housing/presentation/components/Pagination";
import { SyncButton } from "@/features/housing/presentation/components/SyncButton";
import { parseSearchParams, profileQuery } from "@/features/housing/presentation/search-params";

export const dynamic = "force-dynamic";

export default async function HomePage(props: PageProps<"/housing">) {
  const raw = await props.searchParams;
  const parsed = parseSearchParams(raw);
  const container = getHousingContainer();
  const today = todayInKst(container.clock.now());

  const result = await container.searchNotices.execute({
    filters: parsed.filters,
    sort: parsed.sort,
    page: parsed.page,
    profile: parsed.hasProfile ? parsed.profile : undefined,
    verdicts: parsed.hasProfile ? parsed.verdicts : undefined,
  });

  // DB 자체가 비어 있는지 확인해 안내 문구를 바꾼다.
  const anyNotice = result.total > 0 ? null : await container.notices.search({ today, sort: "latest", statuses: ["open", "upcoming", "closed"], limit: 1 });
  const dbEmpty = anyNotice !== null && anyNotice.total === 0;
  const detailQuery = profileQuery(raw);

  return (
    <div className="layout">
      <aside className="sidebar">
        <FilterForm parsed={parsed} />
      </aside>

      <section className="results">
        <div className="results-head">
          <h1>
            {parsed.verdicts.length === 1 && parsed.verdicts[0] === "eligible"
              ? "신청 가능한 공고"
              : "공고 목록"}{" "}
            <span className="count">{result.total.toLocaleString("ko-KR")}건</span>
          </h1>
          {parsed.hasProfile && <p className="hint">내 조건으로 자격을 판정했습니다. 배지에 마우스를 올리면 사유가 보입니다.</p>}
        </div>

        {dbEmpty ? (
          <div className="empty">
            <p>아직 수집된 공고가 없습니다.</p>
            <p>
              터미널에서 <code>npm run housing:sync</code> 를 실행하거나 아래 버튼으로 수집하세요. (공공데이터포털 서비스키가 없으면 SH·iH 크롤러만 동작합니다.)
            </p>
            <SyncButton label="지금 수집" />
          </div>
        ) : result.items.length === 0 ? (
          <div className="empty">
            <p>조건에 맞는 공고가 없습니다. 필터를 완화해 보세요.</p>
          </div>
        ) : (
          <div className="cards">
            {result.items.map((item) => (
              <NoticeCard key={item.notice.id} item={item} today={today} detailQuery={detailQuery} />
            ))}
          </div>
        )}

        <Pagination page={result.page} totalPages={result.totalPages} raw={raw} />
      </section>
    </div>
  );
}
