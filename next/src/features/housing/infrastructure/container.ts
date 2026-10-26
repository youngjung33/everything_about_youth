import { createCrawlFetcher } from "@/common/infrastructure/crawler/crawl-fetcher";
import { getCommonContainer, type CommonContainer } from "@/common/infrastructure/container";
import type { Clock, Logger } from "@/common/application/system";
import type { NoticeRepository } from "../application/ports/notice-repository";
import type { NoticeSourcePort } from "../application/ports/notice-source";
import type { SavedNoticeRepository } from "../application/ports/saved-notice-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { ManageSavedNotices } from "../application/use-cases/manage-saved-notices";
import { EvaluateEligibility } from "../application/use-cases/evaluate-eligibility";
import { GetNoticeDetail } from "../application/use-cases/get-notice-detail";
import { SearchNotices } from "../application/use-cases/search-notices";
import { SyncNoticesFromSource } from "../application/use-cases/sync-notices-from-source";
import { loadHousingConfig, type HousingConfig } from "./config";
import { createHousingRepositories } from "@/common/infrastructure/persistence/create-stores";
import { ApplyhomeSource } from "./sources/applyhome/applyhome-source";
import { BoardCrawlerSource } from "./sources/crawlers/board-crawler";
import { ghStrategy } from "./sources/crawlers/gh/gh-strategy";
import { ihStrategy } from "./sources/crawlers/ih/ih-strategy";
import { shStrategy } from "./sources/crawlers/sh/sh-strategy";
import { LhSource } from "./sources/lh/lh-source";
import { MyhomeSource } from "./sources/myhome/myhome-source";

export interface HousingContainer {
  config: HousingConfig;
  clock: Clock;
  logger: Logger;
  notices: NoticeRepository;
  savedNotices: SavedNoticeRepository;
  syncRuns: SyncRunRepository;
  /** 등록된 모든 소스 (활성 여부와 무관) */
  allSources: NoticeSourcePort[];
  searchNotices: SearchNotices;
  getNoticeDetail: GetNoticeDetail;
  evaluateEligibility: EvaluateEligibility;
  manageSavedNotices: ManageSavedNotices;
  syncNotices: SyncNoticesFromSource;
}

export interface HousingOverrides {
  config?: Partial<HousingConfig>;
}

/** 임대주택 섹션의 의존성 조립 지점. 공통 의존성은 CommonContainer 에서 받는다. */
export function createHousingContainer(common: CommonContainer, overrides: HousingOverrides = {}): HousingContainer {
  const { clock, logger } = common;
  const config = { ...loadHousingConfig(), ...overrides.config };

  const { notices, savedNotices, syncRuns } = createHousingRepositories(common.persistence);

  const serviceKey = common.config.dataGoKrServiceKey;
  const fetchText = createCrawlFetcher({
    userAgent: common.config.crawlUserAgent,
    delayMs: common.config.crawlDelayMs,
    ignoreRobotsHosts: common.config.crawlIgnoreRobotsHosts,
    onRobotsIgnored: (host) => logger.warn(`[crawler] ${host} 의 robots.txt 확인을 건너뜁니다 (CRAWL_IGNORE_ROBOTS_HOSTS 설정)`),
  });
  const onWarn = (message: string) => logger.warn(message);

  const allSources: NoticeSourcePort[] = [
    new LhSource({ serviceKey, onWarn }),
    new MyhomeSource({ serviceKey }),
    new ApplyhomeSource({ serviceKey, onWarn }),
    new BoardCrawlerSource(shStrategy, { fetchText, onWarn }),
    new BoardCrawlerSource(ihStrategy, { fetchText, onWarn }),
    new BoardCrawlerSource(ghStrategy, { fetchText, onWarn }),
  ];
  const active =
    config.enabledSources.length > 0 ? allSources.filter((s) => config.enabledSources.includes(s.id)) : allSources;

  return {
    config,
    clock,
    logger,
    notices,
    savedNotices,
    syncRuns,
    allSources,
    searchNotices: new SearchNotices(notices, clock),
    getNoticeDetail: new GetNoticeDetail(notices, clock),
    evaluateEligibility: new EvaluateEligibility(clock),
    manageSavedNotices: new ManageSavedNotices(savedNotices, notices, clock),
    syncNotices: new SyncNoticesFromSource(active, notices, syncRuns, clock, logger),
  };
}

const globalKey = Symbol.for("everything_about_youth.housing-container");
type GlobalWithContainer = typeof globalThis & { [globalKey]?: HousingContainer };

/** Next.js 개발 모드의 HMR 에서도 하나만 유지한다. */
export function getHousingContainer(): HousingContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createHousingContainer(getCommonContainer());
  return g[globalKey]!;
}
