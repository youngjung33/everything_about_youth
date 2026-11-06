/**
 * finance → living Flutter feature. Run: node scripts/bootstrap-flutter-living.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const flutter = join(import.meta.dirname, "..", "..", "flutter");
const srcDir = join(flutter, "lib", "features", "finance");
const dstDir = join(flutter, "lib", "features", "living");
const testSrc = join(flutter, "test", "features", "finance");
const testDst = join(flutter, "test", "features", "living");

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
  r = r.replace(/finance_/g, "living_");
  r = r.replace(/finance\./g, "living.");
  r = r.replace(/Finance/g, "Living");
  r = r.replace(/finance\//g, "living/");
  r = r.replace(/scheme_list/g, "guide_list");
  r = r.replace(/SchemeList/g, "GuideList");
  r = r.replace(/scheme_schedule/g, "guide_schedule");
  r = r.replace(/SchemeSchedule/g, "GuideSchedule");
  r = r.replace(/saved_scheme/g, "saved_guide");
  r = r.replace(/SavedScheme/g, "SavedGuide");
  r = r.replace(/scheme_detail/g, "guide_detail");
  r = r.replace(/SchemeDetail/g, "GuideDetail");
  r = r.replace(/Scheme/g, "Guide");
  r = r.replace(/schemes\//g, "guides/");
  r = r.replace(/profile_page\.dart$/, "REMOVE_profile_page.dart");
  return r;
}

function transform(content) {
  let s = content
    .replaceAll("features/finance/", "features/living/")
    .replaceAll("FinanceModule", "LivingModule")
    .replaceAll("FinanceRoutes", "LivingRoutes")
    .replaceAll("financeBootstrapTasks", "livingBootstrapTasks")
    .replaceAll("finance_container.dart", "living_container.dart")
    .replaceAll("FinanceContainer", "LivingContainer")
    .replaceAll("FinanceRepository", "LivingRepository")
    .replaceAll("FinanceMeta", "LivingMeta")
    .replaceAll("FinanceScheme", "LivingGuide")
    .replaceAll("FinanceFilters", "LivingFilters")
    .replaceAll("FinanceFilter", "LivingFilter")
    .replaceAll("productTypeId", "procedureTypeId")
    .replaceAll("ProductTypeId", "ProcedureTypeId")
    .replaceAll("'/finance'", "'/living'")
    .replaceAll('"/finance"', '"/living"')
    .replaceAll("/api/v1/finance/", "/api/v1/living/")
    .replaceAll("finance-scheme", "living-guide")
    .replaceAll("finance-meta", "living-meta")
    .replaceAll("SCHEME_NOT_FOUND", "GUIDE_NOT_FOUND")
    .replaceAll("청년 주거·자금", "이사·생활")
    .replaceAll("account_balance_outlined", "home_work_outlined")
    .replaceAll("get id => 'finance'", "get id => 'living'")
    .replaceAll("id => 'finance'", "id => 'living'");
  s = s.replace(/import 'profile_page\.dart';[\r\n]*/g, "");
  s = s.replace(/ProfilePage[^;]*;[\r\n]*/g, "");
  return s;
}

function copyFeature(from, to) {
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  for (const file of walk(from)) {
    const rel = relative(from, file);
    const mapped = mapPath(rel);
    if (mapped.includes("REMOVE_")) continue;
    const out = join(to, mapped);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, transform(readFileSync(file, "utf8")));
  }
}

copyFeature(srcDir, dstDir);
if (existsSync(testSrc)) copyFeature(testSrc, testDst);

const fixturesSrc = join(flutter, "test", "support", "finance_fixtures.dart");
const fixturesDst = join(flutter, "test", "support", "living_fixtures.dart");
if (existsSync(fixturesSrc)) {
  writeFileSync(fixturesDst, transform(readFileSync(fixturesSrc, "utf8")));
}

const memSrc = join(flutter, "test", "support", "finance_memory_stores.dart");
const memDst = join(flutter, "test", "support", "living_memory_stores.dart");
if (existsSync(memSrc)) {
  writeFileSync(memDst, transform(readFileSync(memSrc, "utf8")));
}

const renames = [
  [join(dstDir, "finance_module.dart"), join(dstDir, "living_module.dart")],
  [join(dstDir, "finance_container.dart"), join(dstDir, "living_container.dart")],
  [join(dstDir, "presentation", "finance_routes.dart"), join(dstDir, "presentation", "living_routes.dart")],
];
for (const [a, b] of renames) {
  if (existsSync(a)) renameSync(a, b);
}

console.log("flutter living feature bootstrapped from finance");
