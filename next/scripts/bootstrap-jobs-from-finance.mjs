/**
 * finance → jobs (Next + Flutter). Run: node scripts/bootstrap-jobs-from-finance.mjs
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const nextRoot = join(root, "src");

function walk(dir, files = [], skipDir = () => false) {
  for (const name of readdirSync(dir)) {
    if (skipDir(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files, skipDir);
    else files.push(p);
  }
  return files;
}

function mapRelPath(rel) {
  return rel
    .replace(/\\/g, "/")
    .replace(/finance-schemes/g, "job-postings")
    .replace(/finance_scheme/g, "job_posting")
    .replace(/finance-scheme/g, "job-posting")
    .replace(/scheme-repository/g, "posting-repository")
    .replace(/scheme-source/g, "posting-source")
    .replace(/saved-scheme/g, "saved-posting")
    .replace(/search-schemes/g, "search-job-postings")
    .replace(/get-scheme-detail/g, "get-job-posting-detail")
    .replace(/sync-schemes-from-source/g, "sync-job-postings-from-source")
    .replace(/manage-saved-schemes/g, "manage-saved-job-postings")
    .replace(/sqlite-scheme-repository/g, "sqlite-job-posting-repository")
    .replace(/sqlite-saved-scheme-repository/g, "sqlite-saved-job-posting-repository")
    .replace(/finance-container/g, "jobs-container")
    .replace(/finance-boundary/g, "jobs-boundary")
    .replace(/finance-schemas/g, "jobs-schemas")
    .replace(/schemes\/\[id\]/g, "postings/[id]")
    .replace(/schemes/g, "postings")
    .replace(/scheme_list/g, "posting_list")
    .replace(/scheme_schedule/g, "posting_schedule")
    .replace(/saved_scheme/g, "saved_posting")
    .replace(/SchemeList/g, "PostingList")
    .replace(/SchemeSchedule/g, "PostingSchedule")
    .replace(/SavedScheme/g, "SavedPosting")
    .replace(/scheme\.ts/g, "job-posting.ts");
}

function transform(content) {
  const rules = [
    ["ontong-finance", "REMOVE_ONTONG"],
    ["OntongFinanceSource", "REMOVE_ONTONG"],
    ["ontongFinance", "REMOVE_ONTONG"],
    ["ontongApiKey", "REMOVE_ONTONG"],
    ["BENEFITS_ONTONG", "REMOVE_ONTONG"],
    ["/features/finance/", "/features/jobs/"],
    ["@/features/finance/", "@/features/jobs/"],
    ["features/finance/", "features/jobs/"],
    ["finance-container", "jobs-container"],
    ["FinanceContainer", "JobsContainer"],
    ["createFinanceContainer", "createJobsContainer"],
    ["getFinanceContainer", "getJobsContainer"],
    ["createFinanceRepositories", "createJobsRepositories"],
    ["loadFinanceConfig", "loadJobsConfig"],
    ["FinanceConfig", "JobsConfig"],
    ["FINANCE_FEATURE_ID", "JOBS_FEATURE_ID"],
    ["financeFeature", "jobsFeature"],
    ["FINANCE_BASE", "JOBS_BASE"],
    ["FINANCE_SYNC", "JOBS_SYNC"],
    ["isFinancePath", "isJobsPath"],
    ["finance_sync", "jobs_sync"],
    ["finance_schemes", "job_postings"],
    ["finance_scheme_", "job_posting_"],
    ["saved_finance_schemes", "saved_job_postings"],
    ["finance_sync_runs", "jobs_sync_runs"],
    ["scheme_id", "posting_id"],
    ["SchemeRepository", "JobPostingRepository"],
    ["SchemeSourcePort", "JobPostingSourcePort"],
    ["SavedSchemeRepository", "SavedJobPostingRepository"],
    ["FinanceSchemeDraft", "JobPostingDraft"],
    ["FinanceScheme", "JobPosting"],
    ["SchemeSourceRef", "JobPostingSourceRef"],
    ["SearchSchemes", "SearchJobPostings"],
    ["GetSchemeDetail", "GetJobPostingDetail"],
    ["SyncSchemesFromSource", "SyncJobPostingsFromSource"],
    ["ManageSavedSchemes", "ManageSavedJobPostings"],
    ["syncSchemes", "syncPostings"],
    ["searchSchemes", "searchPostings"],
    ["getSchemeDetail", "getJobPostingDetail"],
    ["savedSchemes", "savedPostings"],
    ["buildSchemeId", "buildJobPostingId"],
    ["createScheme", "createJobPosting"],
    ["mergeScheme", "mergeJobPosting"],
    ["isSameScheme", "isSameJobPosting"],
    ["SqliteSchemeRepository", "SqliteJobPostingRepository"],
    ["SqliteSavedSchemeRepository", "SqliteSavedJobPostingRepository"],
    ["productTypeId", "hireTypeId"],
    ["ProductTypeId", "HireTypeId"],
    ["PRODUCT_TYPE_IDS", "HIRE_TYPE_IDS"],
    ["PRODUCT_TYPE_LABELS", "HIRE_TYPE_LABELS"],
    ["PRODUCT_TYPE", "HIRE_TYPE"],
    ["inferProductTypeFromText", "inferHireTypeFromText"],
    ["SCHEME_STATUSES", "POSTING_STATUSES"],
    ["SCHEME_STATUS_LABELS", "POSTING_STATUS_LABELS"],
    ["SchemeStatus", "PostingStatus"],
    ["getSchemeStatus", "getJobPostingStatus"],
    ["SCHEME_NOT_FOUND", "POSTING_NOT_FOUND"],
    ["programPath", "postingPath"],
    ["finance-meta", "jobs-meta"],
    ["finance-scheme", "jobs-posting"],
    ["contractFinance", "contractJobs"],
    ["financeSyncQuerySchema", "jobsSyncQuerySchema"],
    ["finance-schemas", "jobs-schemas"],
    ["everything_about_youth.finance-container", "everything_about_youth.jobs-container"],
    ["'f_", "'j_"],
    ["청년 주거·자금", "청년·공공 일자리"],
    ["주거·자금", "일자리"],
    ["제도", "공고"],
    ["npm run finance:", "npm run jobs:"],
    ["finance:sync", "jobs:sync"],
    ["finance:seed-demo", "jobs:seed-demo"],
    ["/finance/", "/jobs/"],
    ["/api/v1/finance/", "/api/v1/jobs/"],
    ["id: FINANCE_FEATURE_ID", "id: JOBS_FEATURE_ID"],
    ["defaultEnabled: false", "defaultEnabled: true"],
  ];
  let out = content;
  for (const [from, to] of rules) out = out.replaceAll(from, to);
  if (out.includes("REMOVE_ONTONG")) {
    out = out
      .replace(/import[^\n]*REMOVE_ONTONG[^\n]*\n/g, "")
      .replace(/new REMOVE_ONTONG[^\n]*\n?/g, "")
      .replace(/,\s*new REMOVE_ONTONG[^\]]*/g, "")
      .replace(/REMOVE_ONTONG[^\n]*/g, "")
      .replace(/\{\s*apiKey:[^}]*logger\s*\}\),?\n?/g, "");
  }
  return out;
}

function copyTree(fromDir, toDir, { skipDir = () => false } = {}) {
  if (existsSync(toDir)) rmSync(toDir, { recursive: true, force: true });
  for (const file of walk(fromDir, [], skipDir)) {
    const rel = relative(fromDir, file);
    const mapped = mapRelPath(rel);
    const out = join(toDir, mapped);
    mkdirSync(dirname(out), { recursive: true });
    let text = readFileSync(file, "utf8");
    if (mapped.endsWith("feature.ts") && mapped.includes("jobs/feature.ts")) {
      text = transform(text);
    } else {
      text = transform(text);
    }
    writeFileSync(out, text);
  }
}

// Next feature (skip ontong)
copyTree(join(nextRoot, "features", "finance"), join(nextRoot, "features", "jobs"), {
  skipDir: (n) => n === "ontong",
});
rmSync(join(nextRoot, "features", "jobs", "infrastructure", "sources", "ontong"), { recursive: true, force: true });
rmSync(join(nextRoot, "features", "finance", "finance-container.ts") ? join(nextRoot, "features", "jobs", "finance-container.ts") : "", { force: true });
try {
  renameSync(join(nextRoot, "features", "jobs", "finance-container.ts"), join(nextRoot, "features", "jobs", "jobs-container.ts"));
} catch {
  /* ok */
}

// API routes
copyTree(join(nextRoot, "app", "api", "v1", "finance"), join(nextRoot, "app", "api", "v1", "jobs"));
mkdirSync(join(nextRoot, "app", "jobs", "admin", "sync"), { recursive: true });
if (existsSync(join(nextRoot, "app", "finance", "admin", "sync", "page.tsx"))) {
  writeFileSync(
    join(nextRoot, "app", "jobs", "admin", "sync", "page.tsx"),
    transform(readFileSync(join(nextRoot, "app", "finance", "admin", "sync", "page.tsx"), "utf8")),
  );
}

// scripts
mkdirSync(join(root, "scripts", "jobs"), { recursive: true });
for (const f of ["sync.ts", "seed-demo.ts"]) {
  const src = join(root, "scripts", "finance", f);
  if (existsSync(src)) {
    writeFileSync(join(root, "scripts", "jobs", f), transform(readFileSync(src, "utf8")));
  }
}

// common schema
const finSchema = join(nextRoot, "common", "presentation", "api", "schemas", "finance-schemas.ts");
const jobsSchema = join(nextRoot, "common", "presentation", "api", "schemas", "jobs-schemas.ts");
if (existsSync(finSchema)) writeFileSync(jobsSchema, transform(readFileSync(finSchema, "utf8")));

console.log("Next jobs bootstrapped from finance");

// Flutter
const flutter = join(root, "..", "flutter");
const flutterSrc = join(flutter, "lib", "features", "finance");
const flutterDst = join(flutter, "lib", "features", "jobs");
const flutterTestSrc = join(flutter, "test", "features", "finance");
const flutterTestDst = join(flutter, "test", "features", "jobs");

function flutterTransform(content) {
  return content
    .replaceAll("features/finance/", "features/jobs/")
    .replaceAll("FinanceModule", "JobsModule")
    .replaceAll("FinanceRoutes", "JobsRoutes")
    .replaceAll("financeBootstrapTasks", "jobsBootstrapTasks")
    .replaceAll("finance_container.dart", "jobs_container.dart")
    .replaceAll("FinanceContainer", "JobsContainer")
    .replaceAll("FinanceRepository", "JobsRepository")
    .replaceAll("FinanceMeta", "JobsMeta")
    .replaceAll("FinanceScheme", "JobPosting")
    .replaceAll("FinanceFilters", "JobsFilters")
    .replaceAll("FinanceFilter", "JobsFilter")
    .replaceAll("FinanceUserMessage", "JobsUserMessage")
    .replaceAll("financeErrorMessage", "jobsErrorMessage")
    .replaceAll("categoryId", "hireTypeId")
    .replaceAll("CategoryId", "HireTypeId")
    .replaceAll("productTypeId", "hireTypeId")
    .replaceAll("ProductTypeId", "HireTypeId")
    .replaceAll("'/finance'", "'/jobs'")
    .replaceAll('"/finance"', '"/jobs"')
    .replaceAll("/api/v1/finance/", "/api/v1/jobs/")
    .replaceAll("finance-scheme", "jobs-posting")
    .replaceAll("finance-meta", "jobs-meta")
    .replaceAll("SCHEME_NOT_FOUND", "POSTING_NOT_FOUND")
    .replaceAll("scheme_list", "posting_list")
    .replaceAll("SchemeList", "PostingList")
    .replaceAll("scheme_schedule", "posting_schedule")
    .replaceAll("SchemeSchedule", "PostingSchedule")
    .replaceAll("saved_scheme", "saved_posting")
    .replaceAll("SavedScheme", "SavedPosting")
    .replaceAll("Scheme", "Posting")
    .replaceAll("schemes/", "postings/")
    .replaceAll("SearchSchemes", "SearchJobPostings")
    .replaceAll("scheme", "posting")
    .replaceAll("청년 주거·자금", "청년·공공 일자리")
    .replaceAll("account_balance_outlined", "work_outline")
    .replaceAll("get id => 'finance'", "get id => 'jobs'")
    .replaceAll("defaultEnabled => false", "defaultEnabled => true");
}

function copyFlutter(from, to) {
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  for (const file of walk(from)) {
    const rel = relative(from, file);
    let mapped = rel.replace(/finance_/g, "jobs_").replace(/scheme/g, "posting");
    const out = join(to, mapped);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, flutterTransform(readFileSync(file, "utf8")));
  }
}

if (existsSync(flutterSrc)) {
  copyFlutter(flutterSrc, flutterDst);
  const renames = [
    [join(flutterDst, "finance_module.dart"), join(flutterDst, "jobs_module.dart")],
    [join(flutterDst, "finance_container.dart"), join(flutterDst, "jobs_container.dart")],
    [join(flutterDst, "presentation", "finance_routes.dart"), join(flutterDst, "presentation", "jobs_routes.dart")],
  ];
  for (const [a, b] of renames) {
    try {
      renameSync(a, b);
    } catch {
      /* ok */
    }
  }
}
if (existsSync(flutterTestSrc)) copyFlutter(flutterTestSrc, flutterTestDst);

for (const [src, dst] of [
  [join(flutter, "test", "support", "finance_fixtures.dart"), join(flutter, "test", "support", "jobs_fixtures.dart")],
  [join(flutter, "test", "support", "finance_memory_stores.dart"), join(flutter, "test", "support", "jobs_memory_stores.dart")],
]) {
  if (existsSync(src)) writeFileSync(dst, flutterTransform(readFileSync(src, "utf8")));
}

console.log("Flutter jobs bootstrapped from finance");
