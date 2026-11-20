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

/** 생활정보 섹션에 주입되는 유스케이스·저장소 묶음 */
export interface LivingContainer {
  config: LivingConfig; // config
  clock: Clock; // 시계
  logger: Logger; // 로거
  guides: GuideRepository; // guides
  savedGuides: SavedGuideRepository; // savedGuides
  syncRuns: SyncRunRepository; // syncRuns
  /** 등록된 모든 소스 (활성 여부와 무관) */
  allSources: GuideSourcePort[]; // 등록된 모든 소스 (활성 여부와 무관)
  searchGuides: SearchGuides; // searchGuides
  getGuideDetail: GetGuideDetail; // getGuideDetail
  manageSavedGuides: ManageSavedGuides; // manageSavedGuides
  syncGuides: SyncGuidesFromSource; // syncGuides
}

/** LivingOverrides */
export interface LivingOverrides {
  config?: Partial<LivingConfig>; // config
}

/** 생활정보 섹션의 의존성 조립 지점. 공통 의존성은 CommonContainer 에서 받는다. */
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

const globalKey = Symbol.for("everything_about_youth.living-container"); // HMR 간 싱글톤 키
type GlobalWithContainer = typeof globalThis & { [globalKey]?: LivingContainer };

/** Next.js 개발 모드의 HMR 에서도 하나만 유지한다. */
export function getLivingContainer(): LivingContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createLivingContainer(getCommonContainer());
  return g[globalKey]!;
}
