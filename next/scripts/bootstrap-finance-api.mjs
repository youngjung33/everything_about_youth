/**
 * Copy benefits API/app routes to finance. Run: node scripts/bootstrap-finance-api.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const next = join(import.meta.dirname, "..");
const pairs = [
  [join(next, "src", "app", "api", "v1", "benefits"), join(next, "src", "app", "api", "v1", "finance")],
  [join(next, "src", "app", "benefits"), join(next, "src", "app", "finance")],
];

function xform(s) {
  return s
    .replaceAll("@/features/benefits/", "@/features/finance/")
    .replaceAll("getBenefitsContainer", "getFinanceContainer")
    .replaceAll("benefits-schemas", "finance-schemas")
    .replaceAll("benefitsSyncQuerySchema", "financeSyncQuerySchema")
    .replaceAll("PROGRAM_NOT_FOUND", "SCHEME_NOT_FOUND")
    .replaceAll("programs", "schemes")
    .replaceAll("Programs", "Schemes")
    .replaceAll("Program", "Scheme")
    .replaceAll("/benefits/", "/finance/")
    .replaceAll("handleListPrograms", "handleListSchemes")
    .replaceAll("handleGetProgram", "handleGetScheme")
    .replaceAll("handleSaveProgram", "handleSaveScheme")
    .replaceAll("handleUnsaveProgram", "handleUnsaveScheme")
    .replaceAll("handleMergeSavedPrograms", "handleMergeSavedSchemes")
    .replaceAll("BenefitsApiDeps", "FinanceApiDeps")
    .replaceAll("benefitsGuard", "financeGuard");
}

function copyTree(src, dst) {
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  function walk(from, to) {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
      const fp = join(from, name);
      const tp = join(to, name);
      if (statSync(fp).isDirectory()) walk(fp, tp);
      else {
        let c = readFileSync(fp, "utf8");
        c = xform(c);
        if (name === "route.ts" && tp.includes("programs")) {
          /* path already schemes from xform on folder copy - rename dir */
        }
        writeFileSync(tp, c);
      }
    }
  }
  walk(src, dst);
  // rename programs dirs to schemes
  function renamePrograms(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === "programs") {
          const np = join(dir, "schemes");
          cpSync(p, np, { recursive: true });
          rmSync(p, { recursive: true, force: true });
          renamePrograms(np);
        } else renamePrograms(p);
      }
    }
  }
  renamePrograms(dst);
}

for (const [src, dst] of pairs) {
  if (existsSync(src)) copyTree(src, dst);
}

console.log("finance API routes copied");
