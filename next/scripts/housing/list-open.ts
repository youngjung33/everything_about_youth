/**
 * 접수 중(open) 공고 전체 나열 (일회성 조회 CLI)
 *   npx tsx scripts/housing/list-open.ts
 *   npx tsx scripts/housing/list-open.ts --out=../local/tools/housing-open-report.json
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../load-env";
import { createCommonContainer } from "@/common/infrastructure/container";
import { createHousingContainer } from "@/features/housing/housing-container";
import { SUPPLY_TYPE_LABELS } from "@/features/housing/domain/enums";
import { todayInKst } from "@/common/domain/date";

async function main() {
  loadEnv();
  const common = createCommonContainer();
  const housing = createHousingContainer(common);
  try {
    const today = todayInKst(common.clock.now());
    const pageSize = 100;
    let page = 1;
    const items = [];
    let total = 0;
    do {
      const out = await housing.searchNotices.execute({
        filters: { statuses: ["open"] },
        sort: "deadline",
        page,
        pageSize,
      });
      if (page === 1) total = out.total;
      items.push(...out.items);
      page++;
    } while (page <= Math.ceil(total / pageSize));

    const bySupply: Record<string, number> = {};
    const rows = items.map((row) => {
      const n = row.notice;
      const regions = n.regions.map((r) => (r.sigungu ? `${r.sido} ${r.sigungu}` : r.sido)).join(", ") || "지역 미상";
      const supplyLabel = SUPPLY_TYPE_LABELS[n.supplyType] ?? n.supplyType;
      bySupply[supplyLabel] = (bySupply[supplyLabel] ?? 0) + 1;
      return {
        id: n.id,
        applicationEnd: n.applicationEnd,
        applicationStart: n.applicationStart,
        supplyType: n.supplyType,
        supplyLabel,
        regions,
        organization: n.organization,
        title: n.title,
        url: n.url,
      };
    });
    const upcoming = await housing.searchNotices.execute({
      filters: { statuses: ["upcoming"] },
      pageSize: 1,
      page: 1,
    });
    const report = {
      today,
      syncNote: "npm run housing:sync 직후 SearchNotices(status=open) 결과",
      totalOpen: total,
      totalUpcoming: upcoming.total,
      bySupplyLabel: bySupply,
      items: rows,
    };
    const json = `${JSON.stringify(report, null, 2)}\n`;
    const outArg = process.argv.find((a) => a.startsWith("--out="));
    if (outArg) {
      const outPath = path.resolve(process.cwd(), outArg.slice("--out=".length));
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, json, "utf8");
      console.log(`wrote ${outPath} (${rows.length} open notices)`);
    } else {
      process.stdout.write(json);
    }
  } finally {
    common.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});