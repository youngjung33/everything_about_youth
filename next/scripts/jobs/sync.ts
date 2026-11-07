/**
 * 청년·공공 일자리 공고 수집 CLI
 *   npm run jobs:sync
 *   npm run jobs:sync -- --source=curated
 *   npm run jobs:sync -- --list
 */
import { createCommonContainer } from "@/common/infrastructure/container";
import { parseSourceList } from "@/features/jobs/domain/sync-sources";
import { createJobsContainer } from "@/features/jobs/jobs-container";
import { SOURCE_LABELS } from "@/features/jobs/domain/enums";
import { loadEnv } from "../load-env";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  loadEnv();
  const common = createCommonContainer();
  const container = createJobsContainer(common);
  try {
    if (process.argv.includes("--list")) {
      for (const s of container.allSources) {
        const a = s.checkAvailability();
        console.log(`${s.id.padEnd(16)} ${SOURCE_LABELS[s.id].padEnd(24)} ${a.available ? "사용 가능" : `사용 불가 - ${a.reason}`}`);
      }
      return;
    }

    const requested = parseSourceList(readArg("source"));
    const results = await container.syncPostings.execute(requested.length > 0 ? requested : undefined);

    console.log("\n=== 수집 결과 ===");
    for (const r of results) {
      const detail = r.status === "success" ? `수집 ${r.fetched} / 신규 ${r.inserted} / 갱신 ${r.updated}` : (r.error ?? "");
      console.log(`${r.source.padEnd(16)} ${r.status.padEnd(8)} ${detail}`);
    }
    if (results.some((r) => r.status === "failed")) process.exitCode = 1;
  } finally {
    common.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
