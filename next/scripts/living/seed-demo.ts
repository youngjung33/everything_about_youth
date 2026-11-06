/**
 * UI 확인용 데모 데이터
 *   npm run living:seed-demo
 *   npm run living:seed-demo -- --clear
 */
import { todayInKst } from "@/common/domain/date";
import { createGuide } from "@/features/living/domain/identity";
import type { ProcedureTypeId } from "@/features/living/domain/enums";
import type { LivingGuide, LivingGuideDraft } from "@/features/living/domain/guide";
import type { Sido } from "@/common/domain/region";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteGuideRepository } from "@/features/living/infrastructure/persistence/sqlite/sqlite-guide-repository";
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
  procedureType: ProcedureTypeId;
  tags: string[];
  sido: Sido;
  sigungu: string;
  startOffset: number;
  endOffset: number;
}

const SPECS: DemoSpec[] = [
  { title: "[데모] 전입신고 안내", org: "행정안전부", procedureType: "move_in", tags: ["전입"], sido: "세종", sigungu: "세종시", startOffset: -5, endOffset: 60 },
  { title: "[데모] 확정일자 받기", org: "국토교통부", procedureType: "lease", tags: ["임대차"], sido: "서울", sigungu: "송파구", startOffset: 0, endOffset: 30 },
  { title: "[데모] 공과금 명의 이전", org: "한국전력", procedureType: "utilities", tags: ["전기"], sido: "경기", sigungu: "성남시", startOffset: -1, endOffset: 90 },
  { title: "[데모] 마감된 생활 안내", org: "데모", procedureType: "other", tags: ["기타"], sido: "인천", sigungu: "연수구", startOffset: -30, endOffset: -3 },
];

async function main() {
  loadEnv();
  const config = loadConfig();
  const conn = openSqlite(config.sqlitePath);
  try {
    runMigrations(conn.db);

    if (process.argv.includes("--clear")) {
      const info = conn.raw
        .prepare("DELETE FROM living_guides WHERE id IN (SELECT guide_id FROM living_guide_sources WHERE source = 'demo')")
        .run();
      console.log(`데모 안내 ${info.changes}건 삭제`);
      return;
    }

    const today = todayInKst(new Date());
    const fetchedAt = new Date().toISOString();
    const guides: LivingGuide[] = SPECS.map((s, i) => {
      const draft: LivingGuideDraft = {
        title: s.title,
        organization: s.org,
        procedureTypeId: s.procedureType,
        tags: s.tags,
        regions: [{ sido: s.sido, sigungu: s.sigungu }],
        applicationStart: shift(today, s.startOffset),
        applicationEnd: shift(today, s.endOffset),
        announcementDate: null,
        summary: "화면 확인용 데모 데이터입니다.",
        checklistSteps: [
          { order: 1, title: "준비", summary: "필요 서류를 챙깁니다.", url: null },
          { order: 2, title: "신청", summary: "주민센터 또는 온라인으로 진행합니다.", url: "https://example.com" },
        ],
        url: "https://example.com",
        sources: [{ source: "demo", externalId: `demo-${i + 1}`, url: null, raw: {}, fetchedAt }],
      };
      return createGuide(draft);
    });

    const repo = new SqliteGuideRepository(conn.db);
    const { inserted, updated } = await repo.upsertMany(guides);
    console.log(`데모 안내 ${inserted}건 추가, ${updated}건 갱신`);
  } finally {
    conn.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
