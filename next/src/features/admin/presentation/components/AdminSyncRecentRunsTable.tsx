"use client";

import { AdminSortHeader } from "./AdminSortHeader";
import { useAdminClientTableSort } from "../admin-client-table-sort";

/** 수집 실행 이력 한 행(서버에서 직렬화해 넘긴다) */
export interface AdminSyncRunTableRow {
  id: number; // 실행 번호
  source: string; // 소스 id
  startedAt: string; // 정렬용 ISO
  startedAtDisplay: string; // 표시 시각
  status: string; // 상태 코드
  statusLabel: string; // 상태 라벨
  fetchedCount: number; // 수집 건수(정렬)
  counts: string; // 수집/신규/갱신
  errorText: string; // 마스킹된 오류
}

type RunSortKey = "id" | "source" | "startedAt" | "status" | "fetchedCount" | "errorText";

function compareRow(row: AdminSyncRunTableRow, key: RunSortKey): string | number {
  switch (key) {
    case "id":
      return row.id;
    case "fetchedCount":
      return row.fetchedCount;
    case "startedAt":
      return row.startedAt;
    default:
      return row[key];
  }
}

const DEFAULT_ORDER: Partial<Record<RunSortKey, "asc" | "desc">> = {
  id: "desc",
  source: "asc",
  startedAt: "desc",
  status: "asc",
  fetchedCount: "desc",
  errorText: "asc",
};

/** 최근 수집 실행 표 — 헤더 클릭 정렬(클라이언트) */
export function AdminSyncRecentRunsTable(props: { title?: string; rows: AdminSyncRunTableRow[] }) {
  const { sort, setSortKey, sorted } = useAdminClientTableSort({
    rows: props.rows,
    defaultKey: "id",
    defaultOrder: "desc",
    defaultOrderForKey: DEFAULT_ORDER,
    compare: compareRow,
  });

  return (
    <>
      <h2>{props.title ?? "최근 실행 이력"}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <AdminSortHeader column="id" label="#" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
              <AdminSortHeader column="source" label="소스" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
              <AdminSortHeader column="startedAt" label="시작" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
              <AdminSortHeader column="status" label="결과" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
              <AdminSortHeader column="fetchedCount" label="수집/신규/갱신" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
              <AdminSortHeader column="errorText" label="오류" sortKey={sort.active ? sort.key : ""} sortOrder={sort.active ? sort.order : "asc"} onSort={setSortKey} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.source}</td>
                <td>{r.startedAtDisplay}</td>
                <td>
                  <span className={`badge run-${r.status}`}>{r.statusLabel}</span>
                </td>
                <td>{r.counts}</td>
                <td className="note-cell">{r.errorText}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="hint">
                  아직 실행 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}