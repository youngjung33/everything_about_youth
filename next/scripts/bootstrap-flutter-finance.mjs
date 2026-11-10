/**
 * benefits → finance Flutter feature. Run: node scripts/bootstrap-flutter-finance.mjs
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const flutter = join(import.meta.dirname, "..", "..", "flutter");
const srcDir = join(flutter, "lib", "features", "benefits");
const dstDir = join(flutter, "lib", "features", "finance");
const testSrc = join(flutter, "test", "features", "benefits");
const testDst = join(flutter, "test", "features", "finance");

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function mapPath(rel) {
  let r = rel.replace(/\\/g, "/");
  r = r.replace(/benefits_/g, "finance_");
  r = r.replace(/benefits\./g, "finance.");
  r = r.replace(/benefit_/g, "finance_");
  r = r.replace(/Benefits/g, "Finance");
  r = r.replace(/Benefit/g, "Finance");
  r = r.replace(/benefits\//g, "finance/");
  r = r.replace(/program_list/g, "scheme_list");
  r = r.replace(/ProgramList/g, "SchemeList");
  r = r.replace(/program_schedule/g, "scheme_schedule");
  r = r.replace(/ProgramSchedule/g, "SchemeSchedule");
  r = r.replace(/saved_program/g, "saved_scheme");
  r = r.replace(/SavedProgram/g, "SavedScheme");
  r = r.replace(/Program/g, "Scheme");
  r = r.replace(/programs\//g, "schemes/");
  return r;
}

function transform(content) {
  return content
    .replaceAll("features/benefits/", "features/finance/")
    .replaceAll("BenefitsModule", "FinanceModule")
    .replaceAll("BenefitsRoutes", "FinanceRoutes")
    .replaceAll("benefitsBootstrapTasks", "financeBootstrapTasks")
    .replaceAll("benefits_container.dart", "finance_container.dart")
    .replaceAll("BenefitsContainer", "FinanceContainer")
    .replaceAll("BenefitsRepository", "FinanceRepository")
    .replaceAll("BenefitMeta", "FinanceMeta")
    .replaceAll("BenefitProgram", "FinanceScheme")
    .replaceAll("BenefitFilters", "FinanceFilters")
    .replaceAll("BenefitFilter", "FinanceFilter")
    .replaceAll("categoryId", "productTypeId")
    .replaceAll("CategoryId", "ProductTypeId")
    .replaceAll("'/benefits'", "'/finance'")
    .replaceAll('"/benefits"', '"/finance"')
    .replaceAll("/api/v1/benefits/", "/api/v1/finance/")
    .replaceAll("benefits-program", "finance-scheme")
    .replaceAll("benefits-meta", "finance-meta")
    .replaceAll("PROGRAM_NOT_FOUND", "SCHEME_NOT_FOUND")
    .replaceAll("청년 혜택", "청년 주거·자금")
    .replaceAll("volunteer_activism_outlined", "account_balance_outlined")
    .replaceAll("id => 'benefits'", "id => 'finance'")
    .replaceAll("get id => 'benefits'", "get id => 'finance'");
}

function copyFeature(from, to) {
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  for (const file of walk(from)) {
    const rel = relative(from, file);
    const mapped = mapPath(rel);
    const out = join(to, mapped);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, transform(readFileSync(file, "utf8")));
  }
}

copyFeature(srcDir, dstDir);
if (existsSync(testSrc)) copyFeature(testSrc, testDst);

const fixturesSrc = join(flutter, "test", "support", "benefits_fixtures.dart");
const fixturesDst = join(flutter, "test", "support", "finance_fixtures.dart");
if (existsSync(fixturesSrc)) {
  writeFileSync(fixturesDst, transform(readFileSync(fixturesSrc, "utf8")));
}

const memSrc = join(flutter, "test", "support", "benefits_memory_stores.dart");
const memDst = join(flutter, "test", "support", "finance_memory_stores.dart");
if (existsSync(memSrc)) {
  writeFileSync(memDst, transform(readFileSync(memSrc, "utf8")));
}

// rename key files
const renames = [
  [join(dstDir, "benefits_module.dart"), join(dstDir, "finance_module.dart")],
  [join(dstDir, "benefits_container.dart"), join(dstDir, "finance_container.dart")],
  [join(dstDir, "presentation", "benefits_routes.dart"), join(dstDir, "presentation", "finance_routes.dart")],
];
for (const [a, b] of renames) {
  try {
    renameSync(a, b);
  } catch {
    /* ok */
  }
}

console.log("flutter finance feature bootstrapped");
