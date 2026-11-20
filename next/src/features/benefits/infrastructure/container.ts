import { getCommonContainer, type CommonContainer } from "@/common/infrastructure/container";
import type { Clock, Logger } from "@/common/application/system";
import type { ProgramRepository } from "../application/ports/program-repository";
import type { ProgramSourcePort } from "../application/ports/program-source";
import type { SavedProgramRepository } from "../application/ports/saved-program-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { ManageSavedPrograms } from "../application/use-cases/manage-saved-programs";
import { EvaluateEligibility } from "../application/use-cases/evaluate-eligibility";
import { GetProgramDetail } from "../application/use-cases/get-program-detail";
import { SearchPrograms } from "../application/use-cases/search-programs";
import { SyncProgramsFromSource } from "../application/use-cases/sync-programs-from-source";
import { loadBenefitsConfig, type BenefitsConfig } from "./config";
import { createBenefitsRepositories } from "./create-repositories";
import { OntongSource } from "./sources/ontong/ontong-source";

/** 청년 혜택 섹션 의존성 묶음 */
export interface BenefitsContainer {
  config: BenefitsConfig; // config
  clock: Clock; // 시계
  logger: Logger; // 로거
  programs: ProgramRepository; // programs
  savedPrograms: SavedProgramRepository; // savedPrograms
  syncRuns: SyncRunRepository; // syncRuns
  /** 등록된 모든 소스 (활성 여부 무관) */
  allSources: ProgramSourcePort[]; // 등록된 모든 소스 (활성 여부 무관)
  searchPrograms: SearchPrograms; // searchPrograms
  getProgramDetail: GetProgramDetail; // getProgramDetail
  evaluateEligibility: EvaluateEligibility; // evaluateEligibility
  manageSavedPrograms: ManageSavedPrograms; // manageSavedPrograms
  syncPrograms: SyncProgramsFromSource; // syncPrograms
}

/** 테스트·로컬용 설정 덮어쓰기 */
export interface BenefitsOverrides {
  config?: Partial<BenefitsConfig>; // config
}

/** 청년 혜택 의존성 조립. 공통 의존성은 CommonContainer 에서 받는다. */
export function createBenefitsContainer(common: CommonContainer, overrides: BenefitsOverrides = {}): BenefitsContainer {
  const { clock, logger } = common;
  const config = { ...loadBenefitsConfig(), ...overrides.config };

  const { programs, savedPrograms, syncRuns } = createBenefitsRepositories(common.persistence);

  const allSources: ProgramSourcePort[] = [new OntongSource({ apiKey: config.ontongApiKey, logger })];
  const active =
    config.enabledSources.length > 0 ? allSources.filter((s) => config.enabledSources.includes(s.id)) : allSources;

  return {
    config,
    clock,
    logger,
    programs,
    savedPrograms,
    syncRuns,
    allSources,
    searchPrograms: new SearchPrograms(programs, clock),
    getProgramDetail: new GetProgramDetail(programs, clock),
    evaluateEligibility: new EvaluateEligibility(clock),
    manageSavedPrograms: new ManageSavedPrograms(savedPrograms, programs, clock),
    syncPrograms: new SyncProgramsFromSource(active, programs, syncRuns, clock, logger),
  };
}

const globalKey = Symbol.for("everything_about_youth.benefits-container");
type GlobalWithContainer = typeof globalThis & { [globalKey]?: BenefitsContainer };

/** Next.js HMR 에서도 싱글톤 유지 */
export function getBenefitsContainer(): BenefitsContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createBenefitsContainer(getCommonContainer());
  return g[globalKey]!;
}
