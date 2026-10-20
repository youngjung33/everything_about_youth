import Link from "next/link";
import { notFound } from "next/navigation";
import { todayInKst } from "@/common/domain/date";
import { HOUSING_TYPE_LABELS, NOTICE_STATUS_LABELS, SOURCE_LABELS, SUPPLY_TYPE_LABELS } from "@/features/housing/domain/enums";
import { VERDICT_LABELS } from "@/features/housing/domain/eligibility/evaluate";
import { getHousingContainer } from "@/features/housing/infrastructure/container";
import { regionLabel } from "@/features/housing/presentation/region-label";
import { formatArea, formatDate, formatDday, formatPeriod, formatWon } from "@/common/presentation/format";
import { HOUSING_BASE } from "@/features/housing/presentation/routes";
import { parseSearchParams } from "@/features/housing/presentation/search-params";

export const dynamic = "force-dynamic";

export default async function NoticeDetailPage(props: PageProps<"/housing/notices/[id]">) {
  const { id } = await props.params;
  const raw = await props.searchParams;
  const parsed = parseSearchParams(raw);
  const container = getHousingContainer();

  const item = await container.getNoticeDetail.execute(id, parsed.hasProfile ? parsed.profile : undefined);
  if (!item) notFound();

  const { notice, status, eligibility } = item;
  const today = todayInKst(container.clock.now());
  const dday = formatDday(notice.applicationStart, notice.applicationEnd, today);

  return (
    <article className="detail">
      <p>
        <Link href={HOUSING_BASE}>← 목록으로</Link>
      </p>

      <div className="card-head">
        <span className={`badge status-${status}`}>{NOTICE_STATUS_LABELS[status]}</span>
        {dday && status !== "closed" && <span className="dday">{dday}</span>}
        <span className="badge supply">{SUPPLY_TYPE_LABELS[notice.supplyType]}</span>
        {notice.housingTypes.map((h) => (
          <span key={h} className="badge housing">
            {HOUSING_TYPE_LABELS[h]}
          </span>
        ))}
      </div>
      <h1>{notice.title}</h1>

      <section className="panel">
        <h2>일정 · 기본 정보</h2>
        <dl className="meta wide">
          <div>
            <dt>공급기관</dt>
            <dd>{notice.organization}</dd>
          </div>
          <div>
            <dt>지역</dt>
            <dd>{regionLabel(notice.regions)}</dd>
          </div>
          <div>
            <dt>공고일</dt>
            <dd>{formatDate(notice.announcementDate)}</dd>
          </div>
          <div>
            <dt>접수기간</dt>
            <dd>{formatPeriod(notice.applicationStart, notice.applicationEnd)}</dd>
          </div>
          <div>
            <dt>당첨자 발표</dt>
            <dd>{formatDate(notice.winnerAnnouncementDate)}</dd>
          </div>
          <div>
            <dt>공급세대</dt>
            <dd>{notice.totalHouseholds !== null ? `${notice.totalHouseholds.toLocaleString("ko-KR")}세대` : "-"}</dd>
          </div>
        </dl>
        {notice.url && (
          <p>
            <a className="btn primary" href={notice.url} target="_blank" rel="noopener noreferrer">
              원문 공고 보기
            </a>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>자격 판정</h2>
        {eligibility ? (
          <>
            <p>
              <span className={`badge verdict-${eligibility.verdict} big`}>{VERDICT_LABELS[eligibility.verdict]}</span>
            </p>
            <ul>
              {eligibility.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {eligibility.notes.length > 0 && (
              <ul className="notes">
                {eligibility.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="hint">목록 화면의 &lsquo;내 조건&rsquo;에 나이·소득 등을 입력하면 이 공고의 신청 가능 여부를 판정합니다.</p>
        )}
        <p className="hint">일반적인 공급유형별 기준에 따른 참고용 판정입니다. 공고마다 요건이 다를 수 있으니 원문을 확인하세요.</p>
        {notice.eligibilityText && (
          <blockquote>
            <strong>공고 발췌</strong>
            <br />
            {notice.eligibilityText}
          </blockquote>
        )}
      </section>

      <section className="panel">
        <h2>단지 · 세대유형</h2>
        {notice.complexes.length === 0 ? (
          <p className="hint">이 소스는 단지/세대유형 정보를 제공하지 않습니다. 원문 공고를 확인하세요.</p>
        ) : (
          notice.complexes.map((c, i) => (
            <div key={i} className="complex">
              <h3>
                {c.name ?? "단지"} <small>{HOUSING_TYPE_LABELS[c.housingType]}</small>
              </h3>
              <p className="hint">
                {c.address ?? "주소 미상"}
                {c.households !== null && ` · ${c.households.toLocaleString("ko-KR")}세대`}
              </p>
              {c.units.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>유형</th>
                        <th>전용면적</th>
                        <th>세대수</th>
                        <th>보증금/분양가</th>
                        <th>월 임대료</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.units.map((u, j) => (
                        <tr key={j}>
                          <td>{u.name ?? "-"}</td>
                          <td>{formatArea(u.exclusiveAreaM2)}</td>
                          <td>{u.households ?? "-"}</td>
                          <td>{formatWon(u.deposit)}</td>
                          <td>{formatWon(u.monthlyRent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2>출처</h2>
        <ul>
          {notice.sources.map((s) => (
            <li key={`${s.source}:${s.externalId}`}>
              {SOURCE_LABELS[s.source]} ({s.externalId}){" "}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  원문 링크
                </a>
              )}{" "}
              <small className="hint">수집: {formatDate(s.fetchedAt.slice(0, 10))}</small>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
