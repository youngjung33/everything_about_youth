/**
 * UI 확인용 데모 데이터
 *   npm run benefits:seed-demo
 *   npm run benefits:seed-demo -- --clear
 */
import { todayInKst } from "@/common/domain/date";
import { createProgram } from "@/features/benefits/domain/identity";
import type { CategoryId } from "@/features/benefits/domain/enums";
import type { BenefitProgram, BenefitProgramDraft } from "@/features/benefits/domain/program";
import type { Sido } from "@/common/domain/region";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteProgramRepository } from "@/features/benefits/infrastructure/persistence/sqlite/sqlite-program-repository";
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
  category: CategoryId;
  tags: string[];
  sido: Sido;
  sigungu: string;
  startOffset: number;
  endOffset: number;
}

const SPECS: DemoSpec[] = [
  { title: "[데모] 서울 청년 월세 지원", org: "서울시", category: "housing", tags: ["월세", "청년"], sido: "서울", sigungu: "마포구", startOffset: -2, endOffset: 10 },
  { title: "[데모] 경기 청년 일자리 장려금", org: "경기도", category: "employment", tags: ["취업", "장려금"], sido: "경기", sigungu: "수원시", startOffset: 0, endOffset: 30 },
  { title: "[데모] 청년 전세자금 대출", org: "한국주택금융공사", category: "finance", tags: ["대출", "전세"], sido: "세종", sigungu: "세종시", startOffset: -5, endOffset: 60 },
  { title: "[데모] 대학생 학습 지원", org: "교육부", category: "education", tags: ["장학", "대학생"], sido: "대전", sigungu: "유성구", startOffset: 1, endOffset: 14 },
  { title: "[데모] 청년 창업 패키지", org: "중소벤처기업부", category: "startup", tags: ["창업", "멘토링"], sido: "부산", sigungu: "해운대구", startOffset: -1, endOffset: 20 },
  { title: "[데모] 마감된 청년 복지 프로그램", org: "온통청년", category: "welfare", tags: ["복지"], sido: "인천", sigungu: "연수구", startOffset: -30, endOffset: -3 },
];

async function main() {
  loadEnv();
  const config = loadConfig();
  const conn = openSqlite(config.sqlitePath);
  try {
    runMigrations(conn.db);

    if (process.argv.includes("--clear")) {
      const info = conn.raw
        .prepare("DELETE FROM benefit_programs WHERE id IN (SELECT program_id FROM program_sources WHERE source = 'demo')")
        .run();
      console.log(`데모 정책 ${info.changes}건 삭제`);
      return;
    }

    const today = todayInKst(new Date());
    const fetchedAt = new Date().toISOString();
    const programs: BenefitProgram[] = SPECS.map((s, i) => {
      const draft: BenefitProgramDraft = {
        title: s.title,
        organization: s.org,
        categoryId: s.category,
        tags: s.tags,
        regions: [{ sido: s.sido, sigungu: s.sigungu }],
        applicationStart: shift(today, s.startOffset),
        applicationEnd: shift(today, s.endOffset),
        announcementDate: shift(today, s.startOffset - 7),
        summary: "데모 데이터입니다. 실제 정책이 아닙니다.",
        url: "https://www.youthcenter.go.kr",
        sources: [{ source: "demo", externalId: `demo-${i + 1}`, url: null, raw: { demo: true }, fetchedAt }],
      };
      return createProgram(draft);
    });

    const repo = new SqliteProgramRepository(conn.db);
    const result = await repo.upsertMany(programs);
    console.log(`데모 정책 입력 완료: 신규 ${result.inserted}, 갱신 ${result.updated}`);
  } finally {
    conn.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
