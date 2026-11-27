"use client";

import type { ReactNode } from "react";
import { AdminSortHeader } from "./AdminSortHeader";
import { useAdminClientTableSort } from "../admin-client-table-sort";

/** 소스별 수집 현황 한 행 */
export interface AdminSyncSourceTableRow {
  sourceId: string; // 소스 id
  sourceLabel: string; // 표시 이름
  available: boolean; // 사용 가능
  availableLabel: string; // 예/아니오
  lastRunAt: string | null; // 정렬용 ISO
  lastRunDisplay: string; // 표시 시각
  status: string; // 상태 코드
  statusLabel: string; // 상태 라벨
  fetchedCount: number; // 수집 건수(정렬)
  counts: string; // 수집/신규/갱신 표시
  noteText: string; // 비고·오류
  trigger?: ReactNode; // 수집 버튼
}

type SourceSortKey = "sourceLabel" | "available" | "lastRunAt" | "status" | "fetchedCount" | "noteText";

function compareSource(row: AdminSyncSourceTableRow, key: SourceSortKey): string | number | boolean {
  switch (key) {
    case "sourceLabel":
      return row.sourceLabel;
    case "available":
      return row.available;
    case "lastRunAt":
      return row.lastRunAt ?? "";
    case "status":
      return row.status;
    case "fetchedCount":
      return row.fetchedCount;
    case "noteText":
      return row.noteText;
    default:
      return "";
  }
}

const DEFAULT_ORDER: Partial<Record<SourceSortKey, "asc" | "desc">> = {
  sourceLabel: "asc",
  available: "desc",
  lastRunAt: "desc",
  status: "asc",
  fetchedCount: "desc",
  noteText: "asc",
};

/** 소스별 마지막 수집 표 — 헤더 클릭 정렬(클라이언트) */
export function AdminSyncSourcesTable(props: { rows: AdminSyncSourceTableRow[]; showTriggerColumn?: boolean }) {
  const { sort, setSortKey, sorted } = useAdminClientTableSort({
    rows: props.rows,
    defaultKey: "sourceLabel",
    defaultOrder: "asc",
    defaultOrderForKey: DEFAULT_ORDER,
    compare: compareSource,
  });

  const colCount = 6 + (props.showTriggerColumn ? 1 : 0);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <AdminSortHeader column="sourceLabel" label="소스" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            <AdminSortHeader column="available" label="사용 가능" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            <AdminSortHeader column="lastRunAt" label="마지막 실행" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            <AdminSortHeader column="status" label="결과" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            <AdminSortHeader column="fetchedCount" label="수집/신규/갱신" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            <AdminSortHeader column="noteText" label="비고" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            {props.showTriggerColumn && <th scope="col" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.sourceId}>
              <td>{row.sourceLabel}</td>
              <td>{row.availableLabel}</td>
              <td>{row.lastRunDisplay}</td>
              <td>
                {row.status ? <span className={`badge run-${row.status}`}>{row.statusLabel}</span> : row.statusLabel}
              </td>
              <td>{row.counts}</td>
              <td className="note-cell">{row.noteText}</td>
              {props.showTriggerColumn && <td>{row.trigger}</td>}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={colCount} className="hint">
                표시할 소스가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}