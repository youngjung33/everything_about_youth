/**
 * finance → living feature copy. Run from next/: node scripts/bootstrap-living-from-finance.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "src", "features");
const srcDir = join(root, "finance");
const dstDir = join(root, "living");

const skipDir = /[\\/]sources[\\/]ontong[\\/]/;
const skipFile = /ontong-finance|finance-boundary/;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skipDir.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, files);
    else if (!skipFile.test(basename(p))) files.push(p);
  }
  return files;
}

function mapPath(rel) {
  let r = rel.replace(/\\/g, "/");
  r = r.replace(/get-scheme-detail/g, "get-guide-detail");
  r = r.replace(/search-schemes/g, "search-guides");
  r = r.replace(/manage-saved-schemes/g, "manage-saved-guides");
  r = r.replace(/sync-schemes-from-source/g, "sync-guides-from-source");
  r = r.replace(/scheme-repository/g, "guide-repository");
  r = r.replace(/scheme-source/g, "guide-source");
  r = r.replace(/saved-scheme-repository/g, "saved-guide-repository");
  r = r.replace(/sqlite-scheme-repository/g, "sqlite-guide-repository");
  r = r.replace(/sqlite-saved-scheme-repository/g, "sqlite-saved-guide-repository");
  r = r.replace(/finance-container/g, "living-container");
  r = r.replace(/finance-boundary/g, "living-boundary");
  r = r.replace(/\/scheme\.ts$/, "/guide.ts");
  if (basename(r) === "feature.ts") return null;
  return r;
}

function transform(content) {
  let s = content;
  s = s.replaceAll("@/features/finance/", "@/features/living/");
  s = s.replaceAll("finance-container", "living-container");
  s = s.replaceAll("getFinanceContainer", "getLivingContainer");
  s = s.replaceAll("createFinanceContainer", "createLivingContainer");
  s = s.replaceAll("FinanceContainer", "LivingContainer");
  s = s.replaceAll("FinanceOverrides", "LivingOverrides");
  s = s.replaceAll("loadFinanceConfig", "loadLivingConfig");
  s = s.replaceAll("FinanceConfig", "LivingConfig");
  s = s.replaceAll("createFinanceRepositories", "createLivingRepositories");
  s = s.replaceAll("FINANCE_FEATURE_ID", "LIVING_FEATURE_ID");
  s = s.replaceAll("financeFeature", "livingFeature");
  s = s.replaceAll("FinanceSchemeDraft", "LivingGuideDraft");
  s = s.replaceAll("FinanceScheme", "LivingGuide");
  s = s.replaceAll("SchemeSourceRef", "GuideSourceRef");
  s = s.replaceAll("SchemeRepository", "GuideRepository");
  s = s.replaceAll("SchemeSearchQuery", "GuideSearchQuery");
  s = s.replaceAll("SchemeSearchResult", "GuideSearchResult");
  s = s.replaceAll("SchemeSourcePort", "GuideSourcePort");
  s = s.replaceAll("SavedSchemeRepository", "SavedGuideRepository");
  s = s.replaceAll("SyncSchemesFromSource", "SyncGuidesFromSource");
  s = s.replaceAll("SearchSchemes", "SearchGuides");
  s = s.replaceAll("GetSchemeDetail", "GetGuideDetail");
  s = s.replaceAll("ManageSavedSchemes", "ManageSavedGuides");
  s = s.replaceAll("createScheme", "createGuide");
  s = s.replaceAll("mergeScheme", "mergeGuide");
  s = s.replaceAll("isSameScheme", "isSameGuide");
  s = s.replaceAll("buildSchemeId", "buildGuideId");
  s = s.replaceAll("getSchemeStatus", "getGuideStatus");
  s = s.replaceAll("fetchSchemes", "fetchGuides");
  s = s.replaceAll("dedupeSchemeBatch", "dedupeGuideBatch");
  s = s.replaceAll("financeSchemes", "livingGuides");
  s = s.replaceAll("financeSyncRuns", "livingSyncRuns");
  s = s.replaceAll("savedFinanceSchemes", "savedLivingGuides");
  s = s.replaceAll("financeSchemeRegions", "livingGuideRegions");
  s = s.replaceAll("financeSchemeTags", "livingGuideTags");
  s = s.replaceAll("financeSchemeSources", "livingGuideSources");
  s = s.replaceAll("schemeId", "guideId");
  s = s.replaceAll("SchemeListItem", "GuideListItem");
  s = s.replaceAll("scheme_id", "guide_id");
  s = s.replaceAll("ProductTypeId", "ProcedureTypeId");
  s = s.replaceAll("productTypeId", "procedureTypeId");
  s = s.replaceAll("product_type_id", "procedure_type_id");
  s = s.replaceAll("PRODUCT_TYPES", "PROCEDURE_TYPES");
  s = s.replaceAll("PRODUCT_TYPE_LABELS", "PROCEDURE_TYPE_LABELS");
  s = s.replaceAll("productTypeIds", "procedureTypeIds");
  s = s.replaceAll("inferProductTypeFromText", "inferProcedureTypeFromText");
  s = s.replaceAll("isOntongFinancePolicy", "isOntongLivingPolicy");
  s = s.replaceAll("SyncScheduler as FinanceSyncScheduler", "SyncScheduler as LivingSyncScheduler");
  s = s.replaceAll("financeSync", "livingSync");
  s = s.replaceAll("청년 주거·자금", "이사·생활");
  s = s.replaceAll("finance:", "living:");
  s = s.replaceAll("buildSchemeId(", "buildGuideId(");
  s = s.replaceAll("`f_", "`l_");
  s = s.replaceAll("finance/ontong", "living/curated");
  s = s.replaceAll("ontong-finance", "curated");
  s = s.replaceAll("OntongFinanceSource", "CuratedSource");
  s = s.replaceAll("googleCalendarDeadlineUrl", "googleCalendarDeadlineUrl");
  s = s.replaceAll("SchemeStatus", "GuideStatus");
  s = s.replaceAll("scheme", "guide");
  s = s.replaceAll("Scheme", "Guide");
  s = s.replaceAll("guidesGuides", "guides");
  s = s.replaceAll("GuideGuide", "Guide");
  s = s.replaceAll("LivingLiving", "Living");
  return s;
}

if (existsSync(dstDir)) rmSync(dstDir, { recursive: true, force: true });
mkdirSync(dstDir, { recursive: true });

for (const srcFile of walk(srcDir)) {
  const rel = relative(srcDir, srcFile);
  const mapped = mapPath(rel);
  if (mapped === null) continue;
  const dstFile = join(dstDir, mapped);
  mkdirSync(dirname(dstFile), { recursive: true });
  writeFileSync(dstFile, transform(readFileSync(srcFile, "utf8")));
}

// keep existing living feature.ts
const featureSrc = join(root, "living", "feature.ts");
if (!existsSync(featureSrc)) {
  writeFileSync(
    featureSrc,
    `import type { FeatureDefinition } from "@/common/application/feature-flags";

export const LIVING_FEATURE_ID = "living";

export const livingFeature: FeatureDefinition = { id: LIVING_FEATURE_ID, defaultEnabled: true };
`,
  );
} else {
  let f = readFileSync(featureSrc, "utf8");
  f = f.replace(/defaultEnabled:\s*false/, "defaultEnabled: true");
  writeFileSync(featureSrc, f);
}

console.log("living feature bootstrapped from finance");
