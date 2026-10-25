import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENT_ONLY_ERROR_CODES, listServerErrorCodes } from "../src/common/presentation/api/error-catalog";
import {
  contractHousingMetaDto,
  contractNoticeDetailDto,
  contractNoticeListDto,
  contractSessionDto,
} from "../src/contracts/api-samples";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(repoRoot, "contracts", "api");

const files: Record<string, unknown> = {
  "housing-notice-list.json": contractNoticeListDto(),
  "housing-notice-detail.json": contractNoticeDetailDto(),
  "housing-meta.json": contractHousingMetaDto(),
  "auth-session.json": contractSessionDto(),
  "error-codes.json": { server: listServerErrorCodes(), clientOnly: CLIENT_ONLY_ERROR_CODES },
};

mkdirSync(outDir, { recursive: true });
for (const [name, body] of Object.entries(files)) {
  writeFileSync(path.join(outDir, name), `${JSON.stringify(body, null, 2)}\n`, "utf8");
}
console.log(`[contracts] ${Object.keys(files).length} files → ${outDir}`);
