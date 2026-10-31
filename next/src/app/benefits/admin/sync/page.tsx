import { SOURCE_LABELS } from "@/features/benefits/domain/enums";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { BenefitsSyncButton } from "@/features/benefits/presentation/components/SyncButton";

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

export default async function BenefitsSyncAdminPage() {
  const container = getBenefitsContainer();
  const [latest, recent] = await Promise.all([container.syncRuns.latestPerSource(), container.syncRuns.listRecent(20)]);
  const latestBySource = new Map(latest.map((r) => [r.source, r]));
  const webSyncAllowed = process.env.NODE_ENV !== "production" && !process.env.OPERATOR_TOKEN;

  return (
    <div className="detail">
      <h1>청년 혜택 수집 현황</h1>
      <p className="hint">
        CLI: <code>npm run benefits:sync</code> / <code>npm run benefits:sync -- --source=ontong</code>
      </p>
      {webSyncAllowed && (
        <p>
          <BenefitsSyncButton label="전체 수집" />
        </p>
      )}

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
              {webSyncAllowed && <th />}
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
                  {webSyncAllowed && <td>{availability.available && <BenefitsSyncButton source={s.id} label="수집" />}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
