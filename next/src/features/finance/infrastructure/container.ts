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

export interface FinanceContainer {
  config: FinanceConfig;
  clock: Clock;
  logger: Logger;
  schemes: SchemeRepository;
  savedSchemes: SavedSchemeRepository;
  syncRuns: SyncRunRepository;
  allSources: SchemeSourcePort[];
  searchSchemes: SearchSchemes;
  getSchemeDetail: GetSchemeDetail;
  evaluateEligibility: EvaluateEligibility;
  manageSavedSchemes: ManageSavedSchemes;
  syncSchemes: SyncSchemesFromSource;
}

export interface FinanceOverrides {
  config?: Partial<FinanceConfig>;
}

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

const globalKey = Symbol.for("everything_about_youth.finance-container");
type GlobalWithContainer = typeof globalThis & { [globalKey]?: FinanceContainer };

export function getFinanceContainer(): FinanceContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createFinanceContainer(getCommonContainer());
  return g[globalKey]!;
}
