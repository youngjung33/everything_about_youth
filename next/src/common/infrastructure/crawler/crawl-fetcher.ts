import { httpGetText, sleep } from "../http/http";
import { ALLOW_ALL, parseRobots, type RobotsPolicy } from "./robots";

export class RobotsDisallowedError extends Error {
  constructor(url: string) {
    super(`robots.txt 가 접근을 금지합니다: ${url}`);
    this.name = "RobotsDisallowedError";
  }
}

export type FetchText = (url: string) => Promise<string>;

export interface CrawlFetcherOptions {
  userAgent: string;
  /** 같은 호스트에 대한 요청 간 최소 간격(ms) */
  delayMs: number;
  /** 테스트용 저수준 GET 대체 */
  rawGet?: (url: string, headers: Record<string, string>) => Promise<string>;
  encoding?: string;
  signal?: AbortSignal;
  /**
   * robots.txt 확인을 건너뛸 호스트(명시적으로 허용한 경우만). 기본은 비어 있어 모든 호스트의 robots.txt 를 따른다.
   * User-Agent 를 속이지 않고, 요청 간격(delayMs)도 그대로 적용된다.
   */
  ignoreRobotsHosts?: string[];
  onRobotsIgnored?: (host: string) => void;
}

/**
 * 예의 바른 크롤링용 fetcher:
 *  - robots.txt 확인(호스트별 1회 캐시) 후 금지된 경로는 요청하지 않는다
 *  - 호스트별 최소 요청 간격 유지
 *  - 같은 실행 안에서 동일 URL 은 캐시
 */
export function createCrawlFetcher(options: CrawlFetcherOptions): FetchText {
  const cache = new Map<string, string>();
  const robotsByOrigin = new Map<string, Promise<RobotsPolicy>>();
  const lastRequestAt = new Map<string, number>();
  const headers = { "User-Agent": options.userAgent, Accept: "text/html,application/xhtml+xml" };

  const rawGet =
    options.rawGet ??
    ((url: string, h: Record<string, string>) =>
      httpGetText(url, { headers: h, encoding: options.encoding, signal: options.signal, retries: 1 }));

  async function throttle(host: string): Promise<void> {
    const last = lastRequestAt.get(host) ?? 0;
    const wait = last + options.delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt.set(host, Date.now());
  }

  const ignored = new Set((options.ignoreRobotsHosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean));

  async function loadRobots(origin: string, host: string): Promise<RobotsPolicy> {
    if (ignored.has(host.toLowerCase())) {
      options.onRobotsIgnored?.(host);
      return ALLOW_ALL;
    }
    try {
      await throttle(host);
      const text = await rawGet(`${origin}/robots.txt`, headers);
      // 일부 사이트는 robots.txt 경로에 HTML(404 페이지)을 돌려준다 → 허용으로 간주
      if (/<html/i.test(text.slice(0, 500))) return ALLOW_ALL;
      return parseRobots(text, options.userAgent);
    } catch {
      return ALLOW_ALL;
    }
  }

  return async (url: string) => {
    const cached = cache.get(url);
    if (cached !== undefined) return cached;

    const u = new URL(url);
    let policy = robotsByOrigin.get(u.origin);
    if (!policy) {
      policy = loadRobots(u.origin, u.host);
      robotsByOrigin.set(u.origin, policy);
    }
    if (!(await policy).isAllowed(`${u.pathname}${u.search}`)) throw new RobotsDisallowedError(url);

    await throttle(u.host);
    const text = await rawGet(url, headers);
    cache.set(url, text);
    return text;
  };
}
