import { getFeatureFlags } from "@/features/registry";
import { SyncScheduler } from "@/features/housing/application/sync-scheduler";
import { HOUSING_FEATURE_ID } from "@/features/housing/feature";
import { getHousingContainer } from "@/features/housing/housing-container";

/** 서버가 뜬 뒤 첫 수집까지 기다리는 시간. 시작 직후의 요청을 먼저 처리하게 한다. */
const STARTUP_DELAY_MS = 60_000;

const globalKey = Symbol.for("everything_about_youth.background-jobs");
type GlobalWithJobs = typeof globalThis & { [globalKey]?: { housingSync?: SyncScheduler } };

/**
 * 서버 프로세스 안에서 도는 백그라운드 작업을 시작한다. (`instrumentation.ts` 가 서버 시작 때 한 번 부른다)
 *
 * 지금은 임대주택 공고 자동 수집 하나다. `HOUSING_SYNC_INTERVAL_MINUTES` 가 0 이면 아무것도 하지 않는다.
 * 서버를 여러 대로 늘리면 대신 외부 cron 으로 `npm run housing:sync` 를 한 곳에서만 실행하세요.
 * (대수만큼 중복 수집된다)
 */
export async function startBackgroundJobs(): Promise<void> {
  const g = globalThis as GlobalWithJobs;
  const jobs = (g[globalKey] ??= {});
  if (jobs.housingSync) return; // 개발 모드 HMR 등으로 여러 번 불려도 하나만

  const housing = getHousingContainer();
  const minutes = housing.config.syncIntervalMinutes;
  if (minutes <= 0) return;

  const flags = getFeatureFlags();
  const scheduler = new SyncScheduler({
    intervalMs: minutes * 60_000,
    startupDelayMs: STARTUP_DELAY_MS,
    lastSuccessAt: async () => {
      const iso = await housing.syncRuns.lastSuccessAt();
      return iso ? new Date(iso) : null;
    },
    isEnabled: () => flags.isEnabled(HOUSING_FEATURE_ID),
    run: async () => {
      const results = await housing.syncNotices.execute();
      const failed = results.filter((r) => r.status === "failed").length;
      housing.logger.info(`[sync-scheduler] 자동 수집 끝: 소스 ${results.length}개 중 실패 ${failed}개`);
    },
    now: () => housing.clock.now(),
    logger: housing.logger,
    timers: {
      set: (callback, delayMs) => {
        const handle = setTimeout(callback, delayMs);
        handle.unref?.(); // 이 타이머 때문에 프로세스가 종료되지 못하는 일이 없게
        return handle;
      },
      clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
  });
  jobs.housingSync = scheduler;
  await scheduler.start();
  housing.logger.info(`[sync-scheduler] 공고 자동 수집을 시작합니다. (${minutes}분마다)`);
}
