import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { guardSyncPage, requireAdminSession, syncPageFlags } from "@/features/admin/presentation/admin-page-access";
import { SOURCE_LABELS } from "@/features/housing/domain/enums";
import { getHousingContainer } from "@/features/housing/housing-container";
import { SyncButton } from "@/features/housing/presentation/components/SyncButton";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  running: "실행 중",
  success: "성공",
  failed: "실패",
  skipped: "건너뜀",
};

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

/** 임대주택 공고·데이터 수집 관리 화면. */
export default async function SyncAdminPage() {
  const session = await requireAdminSession();
  guardSyncPage(session, "housing");
  const access = syncPageFlags(session.permissions, "housing");
  const container = getHousingContainer();
  const [latest, recent] = await Promise.all([container.syncRuns.latestPerSource(), container.syncRuns.listRecent(20)]);
  const latestBySource = new Map(latest.map((r) => [r.source, r]));

  return (
    <AdminPageShell session={session}>
    <div className="detail">
      <h1>수집 현황</h1>
      <p className="hint">
        소스별 마지막 수집 결과입니다. CLI: <code>npm run housing:sync</code> / <code>npm run housing:sync -- --source=sh,ih</code>
      </p>
      {access.canTrigger && (
        <p>
          <SyncButton label="전체 수집" />
        </p>
      )}

      {access.canViewSources && (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>소스</th>
              <th>사용 가능</th>
              <th>마지막 실행</th>
              <th>결과</th>
              <th>수집/신규/갱신</th>
              <th>비고</th>
              {access.canTrigger && <th />}
            </tr>
          </thead>
          <tbody>
            {container.allSources.map((s) => {
              const availability = s.checkAvailability();
              const run = latestBySource.get(s.id);
              return (
                <tr key={s.id}>
                  <td>
                    {SOURCE_LABELS[s.id]} <small>({s.id})</small>
                  </td>
                  <td>{availability.available ? "예" : "아니오"}</td>
                  <td>{formatTime(run?.finishedAt ?? run?.startedAt ?? null)}</td>
                  <td>{run ? <span className={`badge run-${run.status}`}>{STATUS_LABEL[run.status]}</span> : "-"}</td>
                  <td>{run ? `${run.fetchedCount} / ${run.insertedCount} / ${run.updatedCount}` : "-"}</td>
                  <td className="note-cell">{availability.available ? (run?.error ?? "") : availability.reason}</td>
                  {access.canTrigger && <td>{availability.available && <SyncButton source={s.id} label="수집" />}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {access.canViewRuns && (
      <>
      <h2>최근 실행 이력</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>소스</th>
              <th>시작</th>
              <th>결과</th>
              <th>수집/신규/갱신</th>
              <th>오류</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.source}</td>
                <td>{formatTime(r.startedAt)}</td>
                <td>
                  <span className={`badge run-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                </td>
                <td>{`${r.fetchedCount} / ${r.insertedCount} / ${r.updatedCount}`}</td>
                <td className="note-cell">{r.error ?? ""}</td>
              </tr>
            ))}
            {recent.length === 0 && (
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
      )}
    </div>
    </AdminPageShell>
  );
}


