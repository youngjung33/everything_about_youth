import Link from "next/link";
import {
  HOUSING_TYPE_LABELS,
  NOTICE_STATUS_LABELS,
  SUPPLY_TYPE_LABELS,
} from "@/features/housing/domain/enums";
import { summarizeUnits } from "@/features/housing/domain/notice";
import type { IsoDate } from "@/common/domain/date";
import type { NoticeListItem } from "@/features/housing/application/use-cases/search-notices";
import { formatArea, formatDday, formatPeriod, formatRange, formatWon } from "@/common/presentation/format";
import { regionLabel } from "../region-label";
import { noticePath } from "../routes";
import { EligibilityBadge } from "./EligibilityBadge";

export function NoticeCard(props: { item: NoticeListItem; today: IsoDate; detailQuery: string }) {
  const { notice, status, eligibility } = props.item;
  const summary = summarizeUnits(notice);
  const dday = formatDday(notice.applicationStart, notice.applicationEnd, props.today);

  return (
    <article className="card">
      <div className="card-head">
        <span className={`badge status-${status}`}>{NOTICE_STATUS_LABELS[status]}</span>
        {dday && status !== "closed" && <span className="dday">{dday}</span>}
        <span className="badge supply">{SUPPLY_TYPE_LABELS[notice.supplyType]}</span>
        {notice.housingTypes.map((h) => (
          <span key={h} className="badge housing">
            {HOUSING_TYPE_LABELS[h]}
          </span>
        ))}
        <EligibilityBadge result={eligibility} />
      </div>

      <h3 className="card-title">
        <Link href={`${noticePath(notice.id)}${props.detailQuery}`}>{notice.title}</Link>
      </h3>

      <dl className="meta">
        <div>
          <dt>공급기관</dt>
          <dd>{notice.organization}</dd>
        </div>
        <div>
          <dt>지역</dt>
          <dd>{regionLabel(notice.regions)}</dd>
        </div>
        <div>
          <dt>접수기간</dt>
          <dd>{formatPeriod(notice.applicationStart, notice.applicationEnd)}</dd>
        </div>
        <div>
          <dt>공급세대</dt>
          <dd>{notice.totalHouseholds !== null ? `${notice.totalHouseholds.toLocaleString("ko-KR")}세대` : "-"}</dd>
        </div>
        <div>
          <dt>보증금/분양가</dt>
          <dd>{summary.minDeposit !== null ? `${formatWon(summary.minDeposit)}~` : "-"}</dd>
        </div>
        <div>
          <dt>월 임대료</dt>
          <dd>{summary.minMonthlyRent !== null ? `${formatWon(summary.minMonthlyRent)}~` : "-"}</dd>
        </div>
        <div>
          <dt>전용면적</dt>
          <dd>{formatRange(summary.minAreaM2, summary.maxAreaM2, formatArea)}</dd>
        </div>
        <div>
          <dt>출처</dt>
          <dd>{notice.sources.map((s) => s.source).join(", ")}</dd>
        </div>
      </dl>
    </article>
  );
}
