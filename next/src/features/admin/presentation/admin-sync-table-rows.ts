import type { AdminSyncSourceTableRow } from "./components/AdminSyncSourcesTable";
import type { AdminSyncRunTableRow } from "./components/AdminSyncRecentRunsTable";
import type { AdminSessionView } from "../application/use-cases/verify-admin-session";
import { formatAdminSyncErrorText } from "./admin-sync-presentation";

/** 소스별 수집 표 한 행으로 매핑 */
export function toAdminSyncSourceRow(params: {
  sourceId: string;
  sourceTitle: string;
  available: boolean;
  unavailableReason: string | undefined;
  run: {
    finishedAt: string | null;
    startedAt: string;
    status: string;
    fetchedCount: number;
    insertedCount: number;
    updatedCount: number;
    error: string | null;
  } | null;
  statusLabel: string;
  session: AdminSessionView;
  canViewRuns: boolean;
  trigger?: AdminSyncSourceTableRow["trigger"];
}): AdminSyncSourceTableRow {
  const lastIso = params.run?.finishedAt ?? params.run?.startedAt ?? null;
  const noteText = params.available
    ? formatAdminSyncErrorText(params.run?.error ?? null, params.session, params.canViewRuns)
    : (params.unavailableReason ?? "");
  return {
    sourceId: params.sourceId,
    sourceLabel: `${params.sourceTitle} (${params.sourceId})`,
    available: params.available,
    availableLabel: params.available ? "예" : "아니오",
    lastRunAt: lastIso,
    lastRunDisplay: lastIso
      ? new Date(lastIso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })
      : "-",
    status: params.run?.status ?? "",
    statusLabel: params.run ? params.statusLabel : "-",
    fetchedCount: params.run?.fetchedCount ?? -1,
    counts: params.run
      ? `${params.run.fetchedCount} / ${params.run.insertedCount} / ${params.run.updatedCount}`
      : "-",
    noteText,
    trigger: params.trigger,
  };
}

/** 최근 실행 이력 한 행으로 매핑 */
export function toAdminSyncRunRow(params: {
  id: number;
  source: string;
  startedAt: string;
  startedAtDisplay: string;
  status: string;
  statusLabel: string;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  errorText: string;
}): AdminSyncRunTableRow {
  return {
    id: params.id,
    source: params.source,
    startedAt: params.startedAt,
    startedAtDisplay: params.startedAtDisplay,
    status: params.status,
    statusLabel: params.statusLabel,
    fetchedCount: params.fetchedCount,
    counts: `${params.fetchedCount} / ${params.insertedCount} / ${params.updatedCount}`,
    errorText: params.errorText,
  };
}