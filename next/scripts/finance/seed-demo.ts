/**
 * UI 확인용 데모 데이터
 *   npm run finance:seed-demo
 *   npm run finance:seed-demo -- --clear
 */
import { todayInKst } from "@/common/domain/date";
import { createScheme } from "@/features/finance/domain/identity";
import type { ProductTypeId } from "@/features/finance/domain/enums";
import type { FinanceScheme, FinanceSchemeDraft } from "@/features/finance/domain/scheme";
import type { Sido } from "@/common/domain/region";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteSchemeRepository } from "@/features/finance/infrastructure/persistence/sqlite/sqlite-scheme-repository";
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
  productType: ProductTypeId;
  tags: string[];
  sido: Sido;
  sigungu: string;
  startOffset: number;
  endOffset: number;
}

const SPECS: DemoSpec[] = [
  { title: "[데모] 청년 전세자금 대출", org: "한국주택금융공사", productType: "jeonse_loan", tags: ["전세"], sido: "세종", sigungu: "세종시", startOffset: -5, endOffset: 60 },
  { title: "[데모] 임대보증금 대출", org: "주택도시보증공사", productType: "lease_deposit", tags: ["보증금"], sido: "서울", sigungu: "송파구", startOffset: 0, endOffset: 30 },
  { title: "[데모] 청약저축 안내", org: "한국주택금융공사", productType: "housing_savings", tags: ["청약"], sido: "경기", sigungu: "성남시", startOffset: -1, endOffset: 90 },
  { title: "[데모] 마감된 금융 지원", org: "온통청년", productType: "other", tags: ["금융"], sido: "인천", sigungu: "연수구", startOffset: -30, endOffset: -3 },
];

async function main() {
  loadEnv();
  const config = loadConfig();
  const conn = openSqlite(config.sqlitePath);
  try {
    runMigrations(conn.db);

    if (process.argv.includes("--clear")) {
      const info = conn.raw
        .prepare("DELETE FROM finance_schemes WHERE id IN (SELECT scheme_id FROM finance_scheme_sources WHERE source = 'demo')")
        .run();
      console.log(`데모 제도 ${info.changes}건 삭제`);
      return;
    }

    const today = todayInKst(new Date());
    const fetchedAt = new Date().toISOString();
    const schemes: FinanceScheme[] = SPECS.map((s, i) => {
      const draft: FinanceSchemeDraft = {
        title: s.title,
        organization: s.org,
        productTypeId: s.productType,
        tags: s.tags,
        regions: [{ sido: s.sido, sigungu: s.sigungu }],
        applicationStart: shift(today, s.startOffset),
        applicationEnd: shift(today, s.endOffset),
        announcementDate: null,
        summary: "화면 확인용 데모 데이터입니다.",
        url: "https://example.com",
        sources: [{ source: "demo", externalId: `demo-${i + 1}`, url: null, raw: {}, fetchedAt }],
      };
      return createScheme(draft);
    });

    const repo = new SqliteSchemeRepository(conn.db);
    const { inserted, updated } = await repo.upsertMany(schemes);
    console.log(`데모 제도 ${inserted}건 추가, ${updated}건 갱신`);
  } finally {
    conn.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
