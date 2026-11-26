"use client";

import { AdminSortHeader } from "./AdminSortHeader";
import { useAdminClientTableSort } from "../admin-client-table-sort";

/** 수집 실행 이력 한 행(서버에서 직렬화해 넘긴다) */
export interface AdminSyncRunTableRow {
  id: number; // 실행 번호
  source: string; // 소스 id
  startedAt: string; // 표시용 시각
  status: string; // 상태 코드
  statusLabel: string; // 상태 라벨
  counts: string; // 수집/신규/갱신
  errorText: string; // 마스킹된 오류
}

type RunSortKey = "id" | "source" | "startedAt" | "status" | "counts";

function compareRow(row: AdminSyncRunTableRow, key: RunSortKey): string | number {
  switch (key) {
    case "id":
      return row.id;
    case "counts":
      return row.counts;
    default:
      return row[key];
  }
}

/** 최근 수집 실행 표 — 헤더 클릭 정렬(클라이언트) */
export function AdminSyncRecentRunsTable(props: { title?: string; rows: AdminSyncRunTableRow[] }) {
  const { sort, setSortKey, sorted } = useAdminClientTableSort({
    rows: props.rows,
    defaultKey: "id",
    compare: compareRow,
  });

  return (
    <>
      <h2>{props.title ?? "최근 실행 이력"}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <AdminSortHeader column="id" label="#" sortKey={sort.key} sortOrder={sort.order} onSort={setSortKey} />
              <AdminSortHeader column="source" label="소스" sortKey={sort.key} sortOrder={sort.order} onSort={setSortKey} />
              <AdminSortHeader column="startedAt" label="시작" sortKey={sort.key} sortOrder={sort.order} onSort={setSortKey} />
              <AdminSortHeader column="status" label="결과" sortKey={sort.key} sortOrder={sort.order} onSort={setSortKey} />
              <AdminSortHeader column="counts" label="수집/신규/갱신" sortKey={sort.key} sortOrder={sort.order} onSort={setSortKey} />
              <th scope="col">오류</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.source}</td>
                <td>{r.startedAt}</td>
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