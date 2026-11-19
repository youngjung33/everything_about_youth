import { getCommonContainer, type CommonContainer } from "@/common/infrastructure/container";
import type { Clock, Logger } from "@/common/application/system";
import type { JobPostingRepository } from "../application/ports/posting-repository";
import type { JobPostingSourcePort } from "../application/ports/posting-source";
import type { SavedJobPostingRepository } from "../application/ports/saved-posting-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { ManageSavedJobPostings } from "../application/use-cases/manage-saved-postings";
import { EvaluateEligibility } from "../application/use-cases/evaluate-eligibility";
import { GetJobPostingDetail } from "../application/use-cases/get-job-posting-detail";
import { SearchJobPostings } from "../application/use-cases/search-job-postings";
import { SyncJobPostingsFromSource } from "../application/use-cases/sync-job-postings-from-source";
import { loadJobsConfig, type JobsConfig } from "./config";
import { createJobsRepositories } from "./create-repositories";
import { CuratedSource } from "./sources/curated/curated-source";

/** 일자리 섹션에 주입되는 유스케이스·저장소 묶음 */
export interface JobsContainer {
  config: JobsConfig;
  clock: Clock;
  logger: Logger;
  postings: JobPostingRepository;
  savedPostings: SavedJobPostingRepository;
  syncRuns: SyncRunRepository;
  /** 등록된 모든 소스 (활성 여부와 무관) */
  allSources: JobPostingSourcePort[];
  searchPostings: SearchJobPostings;
  getJobPostingDetail: GetJobPostingDetail;
  evaluateEligibility: EvaluateEligibility;
  manageSavedPostings: ManageSavedJobPostings;
  syncPostings: SyncJobPostingsFromSource;
}

export interface JobsOverrides {
  config?: Partial<JobsConfig>;
}

/** 일자리 섹션의 의존성 조립 지점. 공통 의존성은 CommonContainer 에서 받는다. */
export function createJobsContainer(common: CommonContainer, overrides: JobsOverrides = {}): JobsContainer {
  const { clock, logger } = common;
  const config = { ...loadJobsConfig(), ...overrides.config };

  const { postings, savedPostings, syncRuns } = createJobsRepositories(common.persistence);

  const allSources: JobPostingSourcePort[] = [
    new CuratedSource(),
      ];
  const active =
    config.enabledSources.length > 0 ? allSources.filter((s) => config.enabledSources.includes(s.id)) : allSources;

  return {
    config,
    clock,
    logger,
    postings,
    savedPostings,
    syncRuns,
    allSources,
    searchPostings: new SearchJobPostings(postings, clock),
    getJobPostingDetail: new GetJobPostingDetail(postings, clock),
    evaluateEligibility: new EvaluateEligibility(clock),
    manageSavedPostings: new ManageSavedJobPostings(savedPostings, postings, clock),
    syncPostings: new SyncJobPostingsFromSource(active, postings, syncRuns, clock, logger),
  };
}

const globalKey = Symbol.for("everything_about_youth.jobs-container"); // HMR 간 싱글톤 키
type GlobalWithContainer = typeof globalThis & { [globalKey]?: JobsContainer };

/** Next.js 개발 모드의 HMR 에서도 하나만 유지한다. */
export function getJobsContainer(): JobsContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createJobsContainer(getCommonContainer());
  return g[globalKey]!;
}
