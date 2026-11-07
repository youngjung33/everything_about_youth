import { getFeatureFlags } from "@/features/registry";
import { SyncScheduler } from "@/features/housing/application/sync-scheduler";
import { HOUSING_FEATURE_ID } from "@/features/housing/feature";
import { getHousingContainer } from "@/features/housing/housing-container";
import { SyncScheduler as BenefitsSyncScheduler } from "@/features/benefits/application/sync-scheduler";
import { BENEFITS_FEATURE_ID } from "@/features/benefits/feature";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";

import { SyncScheduler as FinanceSyncScheduler } from "@/features/finance/application/sync-scheduler";
import { FINANCE_FEATURE_ID } from "@/features/finance/feature";
import { getFinanceContainer } from "@/features/finance/finance-container";

import { SyncScheduler as LivingSyncScheduler } from "@/features/living/application/sync-scheduler";
import { LIVING_FEATURE_ID } from "@/features/living/feature";
import { getLivingContainer } from "@/features/living/living-container";

import { SyncScheduler as JobsSyncScheduler } from "@/features/jobs/application/sync-scheduler";
import { JOBS_FEATURE_ID } from "@/features/jobs/feature";
import { getJobsContainer } from "@/features/jobs/jobs-container";

/** 서버가 뜬 뒤 첫 수집까지 기다리는 시간. 시작 직후의 요청을 먼저 처리하게 한다. */
const STARTUP_DELAY_MS = 60_000;

const globalKey = Symbol.for("everything_about_youth.background-jobs");
type GlobalWithJobs = typeof globalThis & {
  [globalKey]?: {
    housingSync?: SyncScheduler;
    benefitsSync?: BenefitsSyncScheduler;
    financeSync?: FinanceSyncScheduler;
    livingSync?: LivingSyncScheduler;
    jobsSync?: JobsSyncScheduler;
  };
};

/**
 * 서버 프로세스 안에서 도는 백그라운드 작업을 시작한다. (`instrumentation.ts` 가 서버 시작 때 한 번 부른다)
 *
 * `HOUSING_SYNC_INTERVAL_MINUTES` / `BENEFITS_SYNC_INTERVAL_MINUTES` / `FINANCE_SYNC_INTERVAL_MINUTES` 가 0 이면 해당 수집은 하지 않는다.
 */
export async function startBackgroundJobs(): Promise<void> {
  const g = globalThis as GlobalWithJobs;
  const jobs = (g[globalKey] ??= {});

  if (!jobs.housingSync) {
    const housing = getHousingContainer();
    const minutes = housing.config.syncIntervalMinutes;
    if (minutes > 0) {
      const scheduler = new SyncScheduler({
        intervalMs: minutes * 60_000,
        startupDelayMs: STARTUP_DELAY_MS,
        lastSuccessAt: async () => {
          const iso = await housing.syncRuns.lastSuccessAt();
          return iso ? new Date(iso) : null;
        },
        isEnabled: () => getFeatureFlags().isEnabled(HOUSING_FEATURE_ID),
        run: async () => {
          const results = await housing.syncNotices.execute();
          const failed = results.filter((r) => r.status === "failed").length;
          housing.logger.info(`[sync-scheduler] 임대주택 자동 수집 끝: 소스 ${results.length}개 중 실패 ${failed}개`);
        },
        now: () => housing.clock.now(),
        logger: housing.logger,
        timers: schedulerTimers,
      });
      jobs.housingSync = scheduler;
      await scheduler.start();
      housing.logger.info(`[sync-scheduler] 임대주택 공고 자동 수집을 시작합니다. (${minutes}분마다)`);
    }
  }

  if (!jobs.benefitsSync) {
    const benefits = getBenefitsContainer();
    const minutes = benefits.config.syncIntervalMinutes;
    if (minutes > 0) {
      const scheduler = new BenefitsSyncScheduler({
        intervalMs: minutes * 60_000,
        startupDelayMs: STARTUP_DELAY_MS,
        lastSuccessAt: async () => {
          const iso = await benefits.syncRuns.lastSuccessAt();
          return iso ? new Date(iso) : null;
        },
        isEnabled: () => getFeatureFlags().isEnabled(BENEFITS_FEATURE_ID),
        run: async () => {
          const results = await benefits.syncPrograms.execute();
          const failed = results.filter((r) => r.status === "failed").length;
          benefits.logger.info(`[sync-scheduler] 청년혜택 자동 수집 끝: 소스 ${results.length}개 중 실패 ${failed}개`);
        },
        now: () => benefits.clock.now(),
        logger: benefits.logger,
        timers: schedulerTimers,
      });
      jobs.benefitsSync = scheduler;
      await scheduler.start();
      benefits.logger.info(`[sync-scheduler] 청년혜택 정책 자동 수집을 시작합니다. (${minutes}분마다)`);
    }
  }

  if (!jobs.financeSync) {
    const finance = getFinanceContainer();
    const minutes = finance.config.syncIntervalMinutes;
    if (minutes > 0) {
      const scheduler = new FinanceSyncScheduler({
        intervalMs: minutes * 60_000,
        startupDelayMs: STARTUP_DELAY_MS,
        lastSuccessAt: async () => {
          const iso = await finance.syncRuns.lastSuccessAt();
          return iso ? new Date(iso) : null;
        },
        isEnabled: () => getFeatureFlags().isEnabled(FINANCE_FEATURE_ID),
        run: async () => {
          const results = await finance.syncSchemes.execute();
          const failed = results.filter((r) => r.status === "failed").length;
          finance.logger.info(`[sync-scheduler] 청년 주거·자금 자동 수집 끝: 소스 ${results.length}개 중 실패 ${failed}개`);
        },
        now: () => finance.clock.now(),
        logger: finance.logger,
        timers: schedulerTimers,
      });
      jobs.financeSync = scheduler;
      await scheduler.start();
      finance.logger.info(`[sync-scheduler] 청년 주거·자금 자동 수집을 시작합니다. (${minutes}분마다)`);
    }
  }

  if (!jobs.jobsSync) {
    const jobSection = getJobsContainer();
    const jobMinutes = jobSection.config.syncIntervalMinutes;
    if (jobMinutes > 0) {
      const scheduler = new JobsSyncScheduler({
        intervalMs: jobMinutes * 60_000,
        startupDelayMs: STARTUP_DELAY_MS,
        lastSuccessAt: async () => {
          const iso = await jobSection.syncRuns.lastSuccessAt();
          return iso ? new Date(iso) : null;
        },
        isEnabled: () => getFeatureFlags().isEnabled(JOBS_FEATURE_ID),
        run: async () => {
          const results = await jobSection.syncPostings.execute();
          const failed = results.filter((r) => r.status === "failed").length;
          jobSection.logger.info(`[sync-scheduler] 청년·공공 일자리 자동 수집 끝: 소스 ${results.length}개 중 실패 ${failed}개`);
        },
        now: () => jobSection.clock.now(),
        logger: jobSection.logger,
        timers: schedulerTimers,
      });
      jobs.jobsSync = scheduler;
      await scheduler.start();
      jobSection.logger.info(`[sync-scheduler] 청년·공공 일자리 자동 수집을 시작합니다. (${jobMinutes}분마다)`);
    }
  }

  if (!jobs.livingSync) {
    const living = getLivingContainer();
    const minutes = living.config.syncIntervalMinutes;
    if (minutes > 0) {
      const scheduler = new LivingSyncScheduler({
        intervalMs: minutes * 60_000,
        startupDelayMs: STARTUP_DELAY_MS,
        lastSuccessAt: async () => {
          const iso = await living.syncRuns.lastSuccessAt();
          return iso ? new Date(iso) : null;
        },
        isEnabled: () => getFeatureFlags().isEnabled(LIVING_FEATURE_ID),
        run: async () => {
          const results = await living.syncGuides.execute();
          const failed = results.filter((r) => r.status === "failed").length;
          living.logger.info(`[sync-scheduler] 이사·생활 자동 수집 끝: 소스 ${results.length}개 중 실패 ${failed}개`);
        },
        now: () => living.clock.now(),
        logger: living.logger,
        timers: schedulerTimers,
      });
      jobs.livingSync = scheduler;
      await scheduler.start();
      living.logger.info(`[sync-scheduler] 이사·생활 자동 수집을 시작합니다. (${minutes}분마다)`);
    }
  }
}

const schedulerTimers = {
  set: (callback: () => void, delayMs: number) => {
    const handle = setTimeout(callback, delayMs);
    handle.unref?.();
    return handle;
  },
  clear: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
