/**
 * One-off: benefits → finance rename pass. Run from next/: node scripts/bootstrap-finance-from-benefits.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "src", "features");
const srcDir = join(root, "benefits");
const dstDir = join(root, "finance");

const skipDir = /[\\/]standby[\\/]/;
const skipFile = /benefits-boundary\.test\.ts$/;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skipDir.test(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function mapPath(rel) {
  let r = rel.replace(/\\/g, "/");
  r = r.replace(/get-program-detail/g, "get-scheme-detail");
  r = r.replace(/search-programs/g, "search-schemes");
  r = r.replace(/manage-saved-programs/g, "manage-saved-schemes");
  r = r.replace(/sync-programs-from-source/g, "sync-schemes-from-source");
  r = r.replace(/program-repository/g, "scheme-repository");
  r = r.replace(/program-source/g, "scheme-source");
  r = r.replace(/saved-program-repository/g, "saved-scheme-repository");
  r = r.replace(/sqlite-program-repository/g, "sqlite-scheme-repository");
  r = r.replace(/sqlite-saved-program-repository/g, "sqlite-saved-scheme-repository");
  r = r.replace(/benefits-container/g, "finance-container");
  r = r.replace(/benefits-boundary/g, "finance-boundary");
  r = r.replace(/ontong-mapper/g, "ontong-finance-mapper");
  r = r.replace(/ontong-source/g, "ontong-finance-source");
  if (basename(r) === "feature.ts") return null;
  return r;
}

function transform(content, rel) {
  let s = content;
  s = s.replaceAll("@/features/benefits/", "@/features/finance/");
  s = s.replaceAll("benefits-container", "finance-container");
  s = s.replaceAll("getBenefitsContainer", "getFinanceContainer");
  s = s.replaceAll("createBenefitsContainer", "createFinanceContainer");
  s = s.replaceAll("BenefitsContainer", "FinanceContainer");
  s = s.replaceAll("BenefitsOverrides", "FinanceOverrides");
  s = s.replaceAll("loadBenefitsConfig", "loadFinanceConfig");
  s = s.replaceAll("BenefitsConfig", "FinanceConfig");
  s = s.replaceAll("createBenefitsRepositories", "createFinanceRepositories");
  s = s.replaceAll("BENEFITS_FEATURE_ID", "FINANCE_FEATURE_ID");
  s = s.replaceAll("benefitsFeature", "financeFeature");
  s = s.replaceAll("BenefitProgramDraft", "FinanceSchemeDraft");
  s = s.replaceAll("BenefitProgram", "FinanceScheme");
  s = s.replaceAll("ProgramSourceRef", "SchemeSourceRef");
  s = s.replaceAll("ProgramRepository", "SchemeRepository");
  s = s.replaceAll("ProgramSearchQuery", "SchemeSearchQuery");
  s = s.replaceAll("ProgramSearchResult", "SchemeSearchResult");
  s = s.replaceAll("ProgramSourcePort", "SchemeSourcePort");
  s = s.replaceAll("SavedProgramRepository", "SavedSchemeRepository");
  s = s.replaceAll("SyncProgramsFromSource", "SyncSchemesFromSource");
  s = s.replaceAll("SearchPrograms", "SearchSchemes");
  s = s.replaceAll("GetProgramDetail", "GetSchemeDetail");
  s = s.replaceAll("ManageSavedPrograms", "ManageSavedSchemes");
  s = s.replaceAll("createProgram", "createScheme");
  s = s.replaceAll("mergeProgram", "mergeScheme");
  s = s.replaceAll("isSameProgram", "isSameScheme");
  s = s.replaceAll("buildProgramId", "buildSchemeId");
  s = s.replaceAll("getProgramStatus", "getSchemeStatus");
  s = s.replaceAll("fetchPrograms", "fetchSchemes");
  s = s.replaceAll("dedupeBatch", "dedupeSchemeBatch");
  s = s.replaceAll("benefitPrograms", "financeSchemes");
  s = s.replaceAll("benefitSyncRuns", "financeSyncRuns");
  s = s.replaceAll("savedBenefitPrograms", "savedFinanceSchemes");
  s = s.replaceAll("programRegions", "financeSchemeRegions");
  s = s.replaceAll("programTags", "financeSchemeTags");
  s = s.replaceAll("programSources", "financeSchemeSources");
  s = s.replaceAll("programId", "schemeId");
  s = s.replaceAll("categoryId", "productTypeId");
  s = s.replaceAll("CategoryId", "ProductTypeId");
  s = s.replaceAll("categoryIds", "productTypeIds");
  s = s.replaceAll("CATEGORY_IDS", "PRODUCT_TYPE_IDS");
  s = s.replaceAll("CATEGORY_LABELS", "PRODUCT_TYPE_LABELS");
  s = s.replaceAll("CATEGORY_RULES", "PRODUCT_TYPE_RULES");
  s = s.replaceAll("parseCategoryId", "inferProductTypeFromText");
  s = s.replaceAll("PROGRAM_NOT_FOUND", "SCHEME_NOT_FOUND");
  s = s.replaceAll("BenefitsMetaDto", "FinanceMetaDto");
  s = s.replaceAll("ProgramListDto", "SchemeListDto");
  s = s.replaceAll("ProgramDetailDto", "SchemeDetailDto");
  s = s.replaceAll("ProgramSummaryDto", "SchemeSummaryDto");
  s = s.replaceAll("BenefitsApiDeps", "FinanceApiDeps");
  s = s.replaceAll("handleListPrograms", "handleListSchemes");
  s = s.replaceAll("handleGetProgram", "handleGetScheme");
  s = s.replaceAll("toProgramListDto", "toSchemeListDto");
  s = s.replaceAll("toProgramDetailDto", "toSchemeDetailDto");
  s = s.replaceAll("toProgramSummaryDto", "toSchemeSummaryDto");
  s = s.replaceAll("buildMeta", "buildFinanceMeta");
  s = s.replaceAll("SqliteProgramRepository", "SqliteSchemeRepository");
  s = s.replaceAll("SqliteSavedProgramRepository", "SqliteSavedSchemeRepository");
  s = s.replaceAll("OntongSource", "OntongFinanceSource");
  s = s.replaceAll("mapOntongItems", "mapOntongFinanceItems");
  s = s.replaceAll("everything_about_youth.benefits-container", "everything_about_youth.finance-container");
  s = s.replaceAll("benefit_programs", "finance_schemes");
  s = s.replaceAll("benefit_sync_runs", "finance_sync_runs");
  s = s.replaceAll("saved_benefit_programs", "saved_finance_schemes");
  s = s.replaceAll("program_regions", "finance_scheme_regions");
  s = s.replaceAll("program_tags", "finance_scheme_tags");
  s = s.replaceAll("program_sources", "finance_scheme_sources");
  s = s.replaceAll("category_id", "product_type_id");
  s = s.replaceAll('"ontong"', '"ontong-finance"');
  s = s.replaceAll("'ontong'", "'ontong-finance'");
  s = s.replaceAll("SOURCE_IDS = [\"ontong-finance\", \"demo\"]", 'SOURCE_IDS = ["curated", "ontong-finance", "demo"]');
  s = s.replaceAll("id.startsWith(\"b_\")", 'id.startsWith("f_")');
  s = s.replaceAll('startsWith("b_")', 'startsWith("f_")');
  if (rel.includes("identity.ts")) {
    s = s.replace(
      /export function buildMergeKey[\s\S]*?^}/m,
      `export function buildMergeKey(draft: Pick<FinanceSchemeDraft, "sources"> & { mergeKeyHint?: string }): string {
  const primary = draft.sources[0];
  if (primary) return \`\${primary.source}:\${primary.externalId}\`;
  return draft.mergeKeyHint ?? "unknown";
}

export function buildSchemeId(mergeKey: string): string {
  return \`f_\${cyrb53(mergeKey).toString(36)}\`;
}`,
    );
    s = s.replace(
      /export function mergeScheme[\s\S]*?^}/m,
      (block) => block.replace("existing.productTypeId !== \"other\"", 'existing.productTypeId !== "other"'),
    );
    s = s.replace("incoming.categoryId", "incoming.productTypeId");
    s = s.replace("existing.categoryId", "existing.productTypeId");
  }
  if (rel.endsWith("enums.ts")) {
    s = `/** 주거·자금 제도 유형 */
export const PRODUCT_TYPE_IDS = [
  "jeonse_loan",
  "lease_deposit",
  "housing_savings",
  "guarantee",
  "tax_benefit",
  "other",
] as const;
export type ProductTypeId = (typeof PRODUCT_TYPE_IDS)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductTypeId, string> = {
  jeonse_loan: "전세·주택자금대출",
  lease_deposit: "임대보증금",
  housing_savings: "청약·주택저축",
  guarantee: "보증·보증보험",
  tax_benefit: "세금·소득공제",
  other: "기타",
};

export const SCHEME_STATUSES = ["upcoming", "open", "closed"] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

export const SCHEME_STATUS_LABELS: Record<SchemeStatus, string> = {
  upcoming: "신청예정",
  open: "신청중",
  closed: "마감",
};

/** 운영 sync id. 추가 후보는 next/README.md «청년 주거·자금» */
export const SOURCE_IDS = ["curated", "ontong-finance", "demo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  curated: "큐레이션 catalog",
  "ontong-finance": "온통청년(금융·세금)",
  demo: "데모 데이터",
};

const normalizeText = (v: string) => v.replace(/\\s+/g, "");

/** 제목·키워드 → ProductTypeId */
export function inferProductTypeFromText(text: string | null | undefined): ProductTypeId {
  const t = normalizeText(text ?? "");
  if (!t) return "other";
  if (t.includes("전세") || t.includes("주택자금") || t.includes("버팀목")) return "jeonse_loan";
  if (t.includes("보증금") || t.includes("임대보증")) return "lease_deposit";
  if (t.includes("청약") || t.includes("주택저축") || t.includes("청년주택")) return "housing_savings";
  if (t.includes("보증") || t.includes("HUG") || t.includes("HF")) return "guarantee";
  if (t.includes("세금") || t.includes("소득공제") || t.includes("공제")) return "tax_benefit";
  return "other";
}
`;
  }
  if (rel.includes("rules.ts")) {
    s = s.replaceAll("CategoryRule", "ProductTypeRule");
  }
  if (rel.includes("evaluate.ts")) {
    s = s.replaceAll("program.categoryId", "scheme.productTypeId");
    s = s.replaceAll("program.", "scheme.");
  }
  return s;
}

if (existsSync(dstDir)) {
  for (const name of readdirSync(dstDir)) {
    if (name === "feature.ts") continue;
    rmSync(join(dstDir, name), { recursive: true, force: true });
  }
}

const files = walk(srcDir);
for (const file of files) {
  const rel = relative(srcDir, file);
  if (skipFile.test(rel)) continue;
  const mapped = mapPath(rel);
  if (!mapped) continue;
  const out = join(dstDir, mapped);
  mkdirSync(dirname(out), { recursive: true });
  let content = readFileSync(file, "utf8");
  content = transform(content, mapped.replace(/\\/g, "/"));
  writeFileSync(out, content);
}

console.log("Wrote", files.length, "files to finance/");
