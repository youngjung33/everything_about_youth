/**
 * UI 확인용 데모 데이터 입력/삭제 (실제 공고가 아님. 제목에 [데모] 표시)
 *   npm run housing:seed-demo             # 입력
 *   npm run housing:seed-demo -- --clear  # 데모 데이터만 삭제
 */
import { todayInKst } from "@/common/domain/date";
import { createNotice } from "@/features/housing/domain/identity";
import type { HousingType, SupplyType } from "@/features/housing/domain/enums";
import type { Notice, NoticeDraft, UnitType } from "@/features/housing/domain/notice";
import type { Sido } from "@/common/domain/region";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteNoticeRepository } from "@/features/housing/infrastructure/persistence/sqlite/sqlite-notice-repository";
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
  supply: SupplyType;
  housing: HousingType;
  sido: Sido;
  sigungu: string;
  startOffset: number;
  endOffset: number;
  units: UnitType[];
  households: number;
}

const unit = (name: string, area: number, households: number, deposit: number, rent: number | null): UnitType => ({
  name,
  exclusiveAreaM2: area,
  households,
  deposit,
  monthlyRent: rent,
});

const SPECS: DemoSpec[] = [
  { title: "[데모] 강동 청년 행복주택 입주자 모집", org: "서울주택도시공사", supply: "happy_housing", housing: "apartment", sido: "서울", sigungu: "강동구", startOffset: -3, endOffset: 5, households: 120, units: [unit("16A", 16.5, 40, 22_000_000, 98_000), unit("26A", 26.4, 80, 38_000_000, 156_000)] },
  { title: "[데모] 수원 청년 매입임대 입주자 모집", org: "한국토지주택공사", supply: "youth_purchase_rental", housing: "multi_family", sido: "경기", sigungu: "수원시", startOffset: -1, endOffset: 12, households: 60, units: [unit("원룸형", 24, 30, 5_000_000, 140_000), unit("투룸형", 39, 30, 9_000_000, 210_000)] },
  { title: "[데모] 인천 국민임대 입주자 모집", org: "인천도시공사", supply: "national_rental", housing: "apartment", sido: "인천", sigungu: "서구", startOffset: 2, endOffset: 9, households: 200, units: [unit("36", 36.7, 100, 11_000_000, 150_000), unit("46", 46.8, 100, 17_000_000, 230_000)] },
  { title: "[데모] 부산 영구임대 입주자 모집", org: "한국토지주택공사", supply: "permanent_rental", housing: "apartment", sido: "부산", sigungu: "해운대구", startOffset: -5, endOffset: 3, households: 50, units: [unit("26", 26, 50, 4_000_000, 55_000)] },
  { title: "[데모] 대전 오피스텔 분양", org: "OO건설", supply: "private_sale", housing: "officetel", sido: "대전", sigungu: "유성구", startOffset: 1, endOffset: 4, households: 300, units: [unit("49A", 49, 150, 310_000_000, null), unit("59B", 59, 150, 390_000_000, null)] },
  { title: "[데모] 광주 청년 전세임대 입주자 모집", org: "한국토지주택공사", supply: "jeonse_rental", housing: "multi_family", sido: "광주", sigungu: "북구", startOffset: -10, endOffset: 20, households: 150, units: [unit("전세임대", 40, 150, 0, null)] },
  { title: "[데모] 서울 장기전세(미리내집) 입주자 모집", org: "서울주택도시공사", supply: "long_term_jeonse", housing: "apartment", sido: "서울", sigungu: "마포구", startOffset: 0, endOffset: 7, households: 80, units: [unit("59", 59.9, 80, 280_000_000, null)] },
  { title: "[데모] 세종 공공분양 청년 특별공급", org: "한국토지주택공사", supply: "public_sale", housing: "apartment", sido: "세종", sigungu: "세종시", startOffset: 4, endOffset: 8, households: 400, units: [unit("59", 59.8, 200, 420_000_000, null), unit("84", 84.9, 200, 560_000_000, null)] },
  { title: "[데모] 경기 통합공공임대 입주자 모집", org: "경기주택도시공사", supply: "integrated_public_rental", housing: "apartment", sido: "경기", sigungu: "화성시", startOffset: -2, endOffset: 14, households: 500, units: [unit("26", 26.9, 250, 24_000_000, 120_000), unit("36", 36.5, 250, 31_000_000, 175_000)] },
  { title: "[데모] 제주 행복주택(신혼부부) 입주자 모집", org: "한국토지주택공사", supply: "happy_housing", housing: "apartment", sido: "제주", sigungu: "제주시", startOffset: -20, endOffset: -2, households: 70, units: [unit("36", 36, 70, 52_000_000, 190_000)] },
];

async function main() {
  loadEnv();
  const config = loadConfig();
  const conn = openSqlite(config.sqlitePath);
  try {
    runMigrations(conn.db);

    if (process.argv.includes("--clear")) {
      const info = conn.raw
        .prepare("DELETE FROM notices WHERE id IN (SELECT notice_id FROM notice_sources WHERE source = 'demo')")
        .run();
      console.log(`데모 공고 ${info.changes}건 삭제`);
      return;
    }

    const today = todayInKst(new Date());
    const fetchedAt = new Date().toISOString();
    const notices: Notice[] = SPECS.map((s, i) => {
      const draft: NoticeDraft = {
        title: s.title,
        organization: s.org,
        supplyType: s.supply,
        housingTypes: [s.housing],
        regions: [{ sido: s.sido, sigungu: s.sigungu }],
        applicationStart: shift(today, s.startOffset),
        applicationEnd: shift(today, s.endOffset),
        announcementDate: shift(today, s.startOffset - 7),
        winnerAnnouncementDate: shift(today, s.endOffset + 14),
        totalHouseholds: s.households,
        eligibilityText: "데모 데이터입니다. 실제 공고가 아닙니다.",
        url: "https://www.myhome.go.kr",
        complexes: [
          {
            name: `${s.sigungu} 데모단지`,
            address: `${s.sido} ${s.sigungu} 데모로 ${i + 1}`,
            region: { sido: s.sido, sigungu: s.sigungu },
            housingType: s.housing,
            households: s.households,
            units: s.units,
          },
        ],
        sources: [{ source: "demo", externalId: `demo-${i + 1}`, url: null, raw: { demo: true }, fetchedAt }],
      };
      return createNotice(draft);
    });

    const repo = new SqliteNoticeRepository(conn.db);
    const result = await repo.upsertMany(notices);
    console.log(`데모 공고 입력 완료: 신규 ${result.inserted}, 갱신 ${result.updated}`);
  } finally {
    conn.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
