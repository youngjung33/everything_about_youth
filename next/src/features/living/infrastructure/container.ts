import { getCommonContainer, type CommonContainer } from "@/common/infrastructure/container";
import type { Clock, Logger } from "@/common/application/system";
import type { GuideRepository } from "../application/ports/guide-repository";
import type { GuideSourcePort } from "../application/ports/guide-source";
import type { SavedGuideRepository } from "../application/ports/saved-guide-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { ManageSavedGuides } from "../application/use-cases/manage-saved-guides";
import { GetGuideDetail } from "../application/use-cases/get-guide-detail";
import { SearchGuides } from "../application/use-cases/search-guides";
import { SyncGuidesFromSource } from "../application/use-cases/sync-guides-from-source";
import { loadLivingConfig, type LivingConfig } from "./config";
import { createLivingRepositories } from "./create-repositories";
import { CuratedSource } from "./sources/curated/curated-source";

export interface LivingContainer {
  config: LivingConfig;
  clock: Clock;
  logger: Logger;
  guides: GuideRepository;
  savedGuides: SavedGuideRepository;
  syncRuns: SyncRunRepository;
  allSources: GuideSourcePort[];
  searchGuides: SearchGuides;
  getGuideDetail: GetGuideDetail;
  manageSavedGuides: ManageSavedGuides;
  syncGuides: SyncGuidesFromSource;
}

export interface LivingOverrides {
  config?: Partial<LivingConfig>;
}

export function createLivingContainer(common: CommonContainer, overrides: LivingOverrides = {}): LivingContainer {
  const { clock, logger } = common;
  const config = { ...loadLivingConfig(), ...overrides.config };

  const { guides, savedGuides, syncRuns } = createLivingRepositories(common.persistence);

  const allSources: GuideSourcePort[] = [new CuratedSource()];
  const active =
    config.enabledSources.length > 0 ? allSources.filter((s) => config.enabledSources.includes(s.id)) : allSources;

  return {
    config,
    clock,
    logger,
    guides,
    savedGuides,
    syncRuns,
    allSources,
    searchGuides: new SearchGuides(guides, clock),
    getGuideDetail: new GetGuideDetail(guides, clock),
    manageSavedGuides: new ManageSavedGuides(savedGuides, guides, clock),
    syncGuides: new SyncGuidesFromSource(active, guides, syncRuns, clock, logger),
  };
}

const globalKey = Symbol.for("everything_about_youth.living-container");
type GlobalWithContainer = typeof globalThis & { [globalKey]?: LivingContainer };

export function getLivingContainer(): LivingContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createLivingContainer(getCommonContainer());
  return g[globalKey]!;
}
