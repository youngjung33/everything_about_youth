import { describe, expect, it } from "vitest";
import { createCrawlFetcher, RobotsDisallowedError } from "./crawl-fetcher";
import { parseRobots } from "./robots";

describe("robots.txt", () => {
  const robots = `User-agent: *
Disallow: /admin
Disallow: /gcms/brd
Allow: /gcms/brd/open

User-agent: GPTBot
Disallow: /
`;
  it("* 그룹 규칙과 Allow 최장일치를 적용한다", () => {
    const p = parseRobots(robots, "everything-about-youth/0.1");
    expect(p.isAllowed("/main/lay2/list.do?x=1")).toBe(true);
    expect(p.isAllowed("/admin/x")).toBe(false);
    expect(p.isAllowed("/gcms/brd/a")).toBe(false);
    expect(p.isAllowed("/gcms/brd/open/a")).toBe(true);
  });
  it("전면 금지", () => {
    expect(parseRobots("User-agent: *\nDisallow: /\n", "x").isAllowed("/a")).toBe(false);
  });
  it("빈 Disallow 는 모두 허용, UA 전용 그룹이 * 보다 우선", () => {
    expect(parseRobots("User-agent: *\nDisallow:\n", "x").isAllowed("/a")).toBe(true);
    expect(parseRobots("User-agent: *\nAllow: /\nUser-agent: mybot\nDisallow: /", "mybot/1").isAllowed("/a")).toBe(false);
  });
  it("$ 와 * 패턴", () => {
    const p = parseRobots("User-agent: *\nDisallow: /*.pdf$\n", "x");
    expect(p.isAllowed("/a/b.pdf")).toBe(false);
    expect(p.isAllowed("/a/b.pdf?x=1")).toBe(true);
  });
});

describe("crawl fetcher", () => {
  it("robots 금지 경로는 요청하지 않고, 같은 URL 은 캐시한다", async () => {
    const calls: string[] = [];
    const fetchText = createCrawlFetcher({
      userAgent: "test-agent",
      delayMs: 0,
      rawGet: async (url) => {
        calls.push(url);
        if (url.endsWith("/robots.txt")) return "User-agent: *\nDisallow: /private";
        return "ok";
      },
    });
    expect(await fetchText("https://example.com/public/a")).toBe("ok");
    expect(await fetchText("https://example.com/public/a")).toBe("ok");
    await expect(fetchText("https://example.com/private/a")).rejects.toThrow(RobotsDisallowedError);
    expect(calls).toEqual(["https://example.com/robots.txt", "https://example.com/public/a"]);
  });
  it("호스트별 최소 간격을 지킨다", async () => {
    const times: number[] = [];
    const fetchText = createCrawlFetcher({
      userAgent: "t",
      delayMs: 60,
      rawGet: async (url) => {
        if (!url.endsWith("/robots.txt")) times.push(Date.now());
        return url.endsWith("/robots.txt") ? "" : "x";
      },
    });
    await fetchText("https://example.com/1");
    await fetchText("https://example.com/2");
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(50);
  });
});

describe("robots 무시 호스트 (명시적 opt-in)", () => {
  const rawGet = async (url: string) => (url.endsWith("/robots.txt") ? "User-agent: *\nDisallow: /" : "ok");

  it("기본값에서는 robots 금지를 따른다", async () => {
    const fetchText = createCrawlFetcher({ userAgent: "t", delayMs: 0, rawGet });
    await expect(fetchText("https://blocked.example/a")).rejects.toThrow(RobotsDisallowedError);
  });

  it("지정한 호스트만 robots 확인을 건너뛰고, 다른 호스트는 그대로 따른다", async () => {
    const ignored: string[] = [];
    const fetchText = createCrawlFetcher({
      userAgent: "t",
      delayMs: 0,
      rawGet,
      ignoreRobotsHosts: ["Blocked.example"],
      onRobotsIgnored: (h) => ignored.push(h),
    });
    expect(await fetchText("https://blocked.example/a")).toBe("ok");
    await expect(fetchText("https://other.example/a")).rejects.toThrow(RobotsDisallowedError);
    expect(ignored).toEqual(["blocked.example"]);
  });
});
