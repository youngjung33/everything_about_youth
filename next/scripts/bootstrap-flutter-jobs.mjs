import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const flutter = join(import.meta.dirname, "..", "..", "flutter");
const srcDir = join(flutter, "lib", "features", "finance");
const dstDir = join(flutter, "lib", "features", "jobs");
const testSrc = join(flutter, "test", "features", "finance");
const testDst = join(flutter, "test", "features", "jobs");

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function mapPath(rel) {
  return rel
    .replace(/\\/g, "/")
    .replace(/finance_scheme/g, "job_posting")
    .replace(/finance_filters/g, "jobs_filters")
    .replace(/finance_meta/g, "jobs_meta")
    .replace(/finance_repository/g, "jobs_repository")
    .replace(/finance_posting/g, "job_posting")
    .replace(/scheme_list/g, "posting_list")
    .replace(/scheme_schedule/g, "posting_schedule")
    .replace(/saved_scheme/g, "saved_posting")
    .replace(/finance_routes/g, "jobs_routes")
    .replace(/SchemeList/g, "PostingList")
    .replace(/SchemeSchedule/g, "PostingSchedule")
    .replace(/SavedScheme/g, "SavedPosting")
    .replace(/schemes\//g, "postings/");
}

function transform(content) {
  const rules = [
    ["features/finance/", "features/jobs/"],
    ["FinanceModule", "JobsModule"],
    ["FinanceRoutes", "JobsRoutes"],
    ["financeBootstrapTasks", "jobsBootstrapTasks"],
    ["finance_container.dart", "jobs_container.dart"],
    ["FinanceContainer", "JobsContainer"],
    ["FinanceRepository", "JobsRepository"],
    ["FinanceMeta", "JobsMeta"],
    ["FinanceScheme", "JobPosting"],
    ["FinanceFilters", "JobsFilters"],
    ["FinanceFilter", "JobsFilter"],
    ["FinanceUserMessage", "JobsUserMessage"],
    ["financeErrorMessage", "jobsErrorMessage"],
    ["productTypeId", "hireTypeId"],
    ["ProductTypeId", "HireTypeId"],
    ["financeProductTypeFilterPresets", "jobsHireTypeFilterPresets"],
    ["'/finance'", "'/jobs'"],
    ['"/finance"', '"/jobs"'],
    ["/api/v1/finance/", "/api/v1/jobs/"],
    ["finance-scheme", "jobs-posting"],
    ["finance-meta", "jobs-meta"],
    ["SCHEME_NOT_FOUND", "POSTING_NOT_FOUND"],
    ["SearchSchemes", "SearchJobPostings"],
    ["Scheme", "Posting"],
    ["schemes", "postings"],
    ["scheme", "posting"],
    ["청년 주거·자금", "청년·공공 일자리"],
    ["account_balance_outlined", "work_outline"],
    ["get id => 'finance'", "get id => 'jobs'"],
    ["defaultEnabled => false", "defaultEnabled => true"],
    ["financeContainerProvider", "jobsContainerProvider"],
    ["financeMetaProvider", "jobsMetaProvider"],
    ["financeSchedulePostingsProvider", "jobsSchedulePostingsProvider"],
    ["financeDeadlineNotificationServiceProvider", "jobsDeadlineNotificationServiceProvider"],
    ["ServiceCopy.financeDetailVerificationFooter", "ServiceCopy.jobsDetailVerificationFooter"],
    ["eay.finance.", "eay.jobs."],
    ["finance.savedPostings", "jobs.savedPostings"],
    ["finance.", "jobs."],
  ];
  let out = content;
  for (const [a, b] of rules) out = out.replaceAll(a, b);
  return out;
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

const renames = [
  [join(dstDir, "finance_module.dart"), join(dstDir, "jobs_module.dart")],
  [join(dstDir, "finance_container.dart"), join(dstDir, "jobs_container.dart")],
  [join(dstDir, "presentation", "finance_routes.dart"), join(dstDir, "presentation", "jobs_routes.dart")],
];
for (const [a, b] of renames) {
  try {
    renameSync(a, b);
  } catch {
    /* ok */
  }
}

for (const [src, dst] of [
  [join(flutter, "test", "support", "finance_fixtures.dart"), join(flutter, "test", "support", "jobs_fixtures.dart")],
  [join(flutter, "test", "support", "finance_memory_stores.dart"), join(flutter, "test", "support", "jobs_memory_stores.dart")],
]) {
  if (existsSync(src)) writeFileSync(dst, transform(readFileSync(src, "utf8")));
}

console.log("flutter jobs feature bootstrapped from finance");
