import { getCommonContainer, type CommonContainer } from "@/common/infrastructure/container";
import type { Clock, Logger } from "@/common/application/system";
import type { SchemeRepository } from "../application/ports/scheme-repository";
import type { SchemeSourcePort } from "../application/ports/scheme-source";
import type { SavedSchemeRepository } from "../application/ports/saved-scheme-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { ManageSavedSchemes } from "../application/use-cases/manage-saved-schemes";
import { EvaluateEligibility } from "../application/use-cases/evaluate-eligibility";
import { GetSchemeDetail } from "../application/use-cases/get-scheme-detail";
import { SearchSchemes } from "../application/use-cases/search-schemes";
import { SyncSchemesFromSource } from "../application/use-cases/sync-schemes-from-source";
import { loadFinanceConfig, type FinanceConfig } from "./config";
import { createFinanceRepositories } from "./create-repositories";
import { CuratedSource } from "./sources/curated/curated-source";
import { OntongFinanceSource } from "./sources/ontong/ontong-finance-source";

/** 금융·자금 섹션에 주입되는 유스케이스·저장소 묶음 */
export interface FinanceContainer {
  config: FinanceConfig; // config
  clock: Clock; // 시계
  logger: Logger; // 로거
  schemes: SchemeRepository; // schemes
  savedSchemes: SavedSchemeRepository; // savedSchemes
  syncRuns: SyncRunRepository; // syncRuns
  /** 등록된 모든 소스 (활성 여부와 무관) */
  allSources: SchemeSourcePort[]; // 등록된 모든 소스 (활성 여부와 무관)
  searchSchemes: SearchSchemes; // searchSchemes
  getSchemeDetail: GetSchemeDetail; // getSchemeDetail
  evaluateEligibility: EvaluateEligibility; // evaluateEligibility
  manageSavedSchemes: ManageSavedSchemes; // manageSavedSchemes
  syncSchemes: SyncSchemesFromSource; // syncSchemes
}

/** FinanceOverrides */
export interface FinanceOverrides {
  config?: Partial<FinanceConfig>; // config
}

/** 금융·자금 섹션의 의존성 조립 지점. 공통 의존성은 CommonContainer 에서 받는다. */
export function createFinanceContainer(common: CommonContainer, overrides: FinanceOverrides = {}): FinanceContainer {
  const { clock, logger } = common;
  const config = { ...loadFinanceConfig(), ...overrides.config };

  const { schemes, savedSchemes, syncRuns } = createFinanceRepositories(common.persistence);

  const allSources: SchemeSourcePort[] = [
    new CuratedSource(),
    new OntongFinanceSource({ apiKey: config.ontongApiKey, logger }),
  ];
  const active =
    config.enabledSources.length > 0 ? allSources.filter((s) => config.enabledSources.includes(s.id)) : allSources;

  return {
    config,
    clock,
    logger,
    schemes,
    savedSchemes,
    syncRuns,
    allSources,
    searchSchemes: new SearchSchemes(schemes, clock),
    getSchemeDetail: new GetSchemeDetail(schemes, clock),
    evaluateEligibility: new EvaluateEligibility(clock),
    manageSavedSchemes: new ManageSavedSchemes(savedSchemes, schemes, clock),
    syncSchemes: new SyncSchemesFromSource(active, schemes, syncRuns, clock, logger),
  };
}

const globalKey = Symbol.for("everything_about_youth.finance-container"); // HMR 간 싱글톤 키
type GlobalWithContainer = typeof globalThis & { [globalKey]?: FinanceContainer };

/** Next.js 개발 모드의 HMR 에서도 하나만 유지한다. */
export function getFinanceContainer(): FinanceContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createFinanceContainer(getCommonContainer());
  return g[globalKey]!;
}
