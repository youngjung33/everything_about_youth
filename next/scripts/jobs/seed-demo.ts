/**
 * UI 확인용 데모 데이터
 *   npm run jobs:seed-demo
 *   npm run jobs:seed-demo -- --clear
 */
import { todayInKst } from "@/common/domain/date";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { HireTypeId } from "@/features/jobs/domain/enums";
import type { JobPosting, JobPostingDraft } from "@/features/jobs/domain/job-posting";
import type { Sido } from "@/common/domain/region";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteJobPostingRepository } from "@/features/jobs/infrastructure/persistence/sqlite/sqlite-posting-repository";
import { loadConfig } from "@/common/infrastructure/config/env";
import { loadEnv } from "../load-env";

function shift(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface DemoSpec {
  title: string;
  org: string;
  hireType: HireTypeId;
  tags: string[];
  sido: Sido;
  sigungu: string;
  startOffset: number;
  endOffset: number;
}

const SPECS: DemoSpec[] = [
  { title: "[데모] 공기업 신입 NCS 채용", org: "한국수자원공사", hireType: "public_corp", tags: ["신입", "NCS"], sido: "대전", sigungu: "대전시", startOffset: -3, endOffset: 45 },
  { title: "[데모] 9급 일반행정 공무원", org: "인사혁신처", hireType: "public_official", tags: ["공무원"], sido: "세종", sigungu: "세종시", startOffset: 0, endOffset: 30 },
  { title: "[데모] 청년인턴(직무체험)", org: "서울시", hireType: "intern", tags: ["청년", "인턴"], sido: "서울", sigungu: "중구", startOffset: -1, endOffset: 60 },
  { title: "[데모] 마감된 신입 채용", org: "데모기관", hireType: "new_grad", tags: ["신입"], sido: "부산", sigungu: "해운대구", startOffset: -40, endOffset: -5 },
];

async function main() {
  loadEnv();
  const config = loadConfig();
  const conn = openSqlite(config.sqlitePath);
  try {
    runMigrations(conn.db);

    if (process.argv.includes("--clear")) {
      const info = conn.raw
        .prepare("DELETE FROM job_postings WHERE id IN (SELECT posting_id FROM job_posting_sources WHERE source = 'demo')")
        .run();
      console.log(`데모 공고 ${info.changes}건 삭제`);
      return;
    }

    const today = todayInKst(new Date());
    const fetchedAt = new Date().toISOString();
    const postings: JobPosting[] = SPECS.map((s, i) => {
      const draft: JobPostingDraft = {
        title: s.title,
        organization: s.org,
        hireTypeId: s.hireType,
        tags: s.tags,
        regions: [{ sido: s.sido, sigungu: s.sigungu }],
        applicationStart: shift(today, s.startOffset),
        applicationEnd: shift(today, s.endOffset),
        announcementDate: null,
        summary: "화면 확인용 데모 채용 공고입니다.",
        url: "https://example.com",
        sources: [{ source: "demo", externalId: `demo-${i + 1}`, url: null, raw: {}, fetchedAt }],
      };
      return createJobPosting(draft);
    });

    const repo = new SqliteJobPostingRepository(conn.db);
    const { inserted, updated } = await repo.upsertMany(postings);
    console.log(`데모 공고 ${inserted}건 추가, ${updated}건 갱신`);
  } finally {
    conn.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
