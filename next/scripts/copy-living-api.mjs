import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "..");
const pairs = [
  ["src/app/api/v1/finance/schemes/route.ts", "src/app/api/v1/living/guides/route.ts"],
  ["src/app/api/v1/finance/schemes/[id]/route.ts", "src/app/api/v1/living/guides/[id]/route.ts"],
  ["src/app/api/v1/finance/schemes/[id]/calendar/route.ts", "src/app/api/v1/living/guides/[id]/calendar/route.ts"],
  ["src/app/api/v1/finance/meta/route.ts", "src/app/api/v1/living/meta/route.ts"],
  ["src/app/api/v1/finance/saved/route.ts", "src/app/api/v1/living/saved/route.ts"],
  ["src/app/api/v1/finance/saved/ids/route.ts", "src/app/api/v1/living/saved/ids/route.ts"],
  ["src/app/api/v1/finance/saved/[id]/route.ts", "src/app/api/v1/living/saved/[id]/route.ts"],
  ["src/app/api/v1/finance/sync/route.ts", "src/app/api/v1/living/sync/route.ts"],
];

function transform(s) {
  return s
    .replaceAll("finance", "living")
    .replaceAll("Finance", "Living")
    .replaceAll("schemes", "guides")
    .replaceAll("Schemes", "Guides")
    .replaceAll("Scheme", "Guide")
    .replaceAll("mergeSavedSchemesBodySchema", "mergeSavedGuidesBodySchema")
    .replaceAll("finance-schemas", "living-schemas")
    .replaceAll("syncSchemes", "syncGuides");
}

for (const [a, b] of pairs) {
  const out = join(root, b);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, transform(readFileSync(join(root, a), "utf8")));
}
console.log("living API routes copied");
