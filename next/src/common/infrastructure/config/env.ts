import { z } from "zod";

/** 빈 문자열은 "설정 안 함"으로 취급한다 (.env 에 `KEY=` 만 적어 둔 경우). */
export const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const schema = z.object({
  DATA_GO_KR_SERVICE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  DB_DRIVER: z.preprocess(emptyToUndefined, z.enum(["sqlite", "supabase"]).default("sqlite")),
  SQLITE_PATH: z.preprocess(emptyToUndefined, z.string().default("./data/app.db")),
  CRAWL_DELAY_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(1500)),
  CRAWL_USER_AGENT: z.preprocess(emptyToUndefined, z.string().default("everything-about-youth/0.1 (personal use)")),
  CRAWL_IGNORE_ROBOTS_HOSTS: z.preprocess(emptyToUndefined, z.string().optional()),
});

/** 모든 섹션이 공유하는 설정. 섹션 전용 설정은 각 feature 의 config 에 둔다. */
export interface AppConfig {
  dataGoKrServiceKey: string | undefined;
  dbDriver: "sqlite" | "supabase";
  sqlitePath: string;
  crawlDelayMs: number;
  crawlUserAgent: string;
  /** robots.txt 확인을 건너뛸 호스트 (명시적 opt-in) */
  crawlIgnoreRobotsHosts: string[];
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = schema.parse(env);
  return {
    dataGoKrServiceKey: parsed.DATA_GO_KR_SERVICE_KEY,
    dbDriver: parsed.DB_DRIVER,
    sqlitePath: parsed.SQLITE_PATH,
    crawlDelayMs: parsed.CRAWL_DELAY_MS,
    crawlUserAgent: parsed.CRAWL_USER_AGENT,
    crawlIgnoreRobotsHosts: (parsed.CRAWL_IGNORE_ROBOTS_HOSTS ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  };
}
