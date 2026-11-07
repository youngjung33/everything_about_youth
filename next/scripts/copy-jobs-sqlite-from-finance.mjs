import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = join(import.meta.dirname, "..", "src", "features");
const pairs = [
  ["finance/infrastructure/persistence/sqlite/sqlite-scheme-repository.ts", "jobs/infrastructure/persistence/sqlite/sqlite-posting-repository.ts"],
  ["finance/infrastructure/persistence/sqlite/sqlite-saved-scheme-repository.ts", "jobs/infrastructure/persistence/sqlite/sqlite-saved-posting-repository.ts"],
  ["finance/infrastructure/persistence/sqlite/sqlite-sync-run-repository.ts", "jobs/infrastructure/persistence/sqlite/sqlite-sync-run-repository.ts"],
  ["finance/infrastructure/persistence/sqlite/sqlite-repositories.test.ts", "jobs/infrastructure/persistence/sqlite/sqlite-repositories.test.ts"],
  ["finance/infrastructure/create-repositories.ts", "jobs/infrastructure/create-repositories.ts"],
];

const rules = [
  ["/features/finance/", "/features/jobs/"],
  ["SchemeRepository", "JobPostingRepository"],
  ["SchemeSearchQuery", "PostingSearchQuery"],
  ["SchemeSearchResult", "PostingSearchResult"],
  ["ProductTypeId", "HireTypeId"],
  ["FinanceScheme", "JobPosting"],
  ["SchemeSourceRef", "JobPostingSourceRef"],
  ["financeSchemes", "jobPostings"],
  ["financeSchemeRegions", "jobPostingRegions"],
  ["financeSchemeTags", "jobPostingTags"],
  ["financeSchemeSources", "jobPostingSources"],
  ["schemeId", "postingId"],
  ["productTypeId", "hireTypeId"],
  ["productTypeIds", "hireTypeIds"],
  ["SqliteSchemeRepository", "SqliteJobPostingRepository"],
  ["SqliteSavedSchemeRepository", "SqliteSavedJobPostingRepository"],
  ["SavedSchemeRepository", "SavedJobPostingRepository"],
  ["SavedScheme", "SavedPosting"],
  ["createFinanceRepositories", "createJobsRepositories"],
  ["finance_sync_runs", "jobs_sync_runs"],
  ["financeSyncRuns", "jobsSyncRuns"],
  ["schemes:", "postings:"],
  ["jeonse_loan", "public_corp"],
];

const morePairs = [
  ["finance/domain/scheme.ts", "jobs/domain/job-posting.ts"],
  ["finance/domain/identity.ts", "jobs/domain/identity.ts"],
  ["finance/application/ports/scheme-repository.ts", "jobs/application/ports/posting-repository.ts"],
  ["finance/application/ports/scheme-source.ts", "jobs/application/ports/posting-source.ts"],
  ["finance/application/ports/saved-scheme-repository.ts", "jobs/application/ports/saved-posting-repository.ts"],
  ["finance/infrastructure/config.ts", "jobs/infrastructure/config.ts"],
  ["finance/finance-boundary.test.ts", "jobs/jobs-boundary.test.ts"],
  ["finance/presentation/api/handlers.ts", "jobs/presentation/api/handlers.ts"],
  ["finance/presentation/api/dto.ts", "jobs/presentation/api/dto.ts"],
  ["finance/presentation/routes.ts", "jobs/presentation/routes.ts"],
];

const domainRules = [
  ["getSchemeStatus", "getJobPostingStatus"],
  ["createScheme", "createJobPosting"],
  ["buildSchemeId", "buildJobPostingId"],
  ["mergeScheme", "mergeJobPosting"],
  ["isSameScheme", "isSameJobPosting"],
  ["loadFinanceConfig", "loadJobsConfig"],
  ["FinanceConfig", "JobsConfig"],
  ["FINANCE_SYNC", "JOBS_SYNC"],
  ["FinanceApiDeps", "JobsApiDeps"],
  ["FINANCE_FEATURE_ID", "JOBS_FEATURE_ID"],
  ["contractFinance", "contractJobs"],
  ["DEFAULT_PAGE_SIZE", "DEFAULT_PAGE_SIZE"],
  ["manageSavedSchemes", "manageSavedPostings"],
  ["getFinanceContainer", "getJobsContainer"],
  ["SCHEME_NOT_FOUND", "POSTING_NOT_FOUND"],
  ["SchemeFilters", "PostingFilters"],
  ["SearchSchemes", "SearchJobPostings"],
  ["GetSchemeDetail", "GetJobPostingDetail"],
  ["SyncSchemesFromSource", "SyncJobPostingsFromSource"],
  ["ManageSavedSchemes", "ManageSavedJobPostings"],
  ["searchSchemes", "searchPostings"],
  ["getSchemeDetail", "getJobPostingDetail"],
  ["syncSchemes", "syncPostings"],
  ["savedSchemes", "savedPostings"],
  ["/finance", "/jobs"],
  ["finance_", "jobs_"],
  ["'f_", "'j_"],
  ["finance 조립", "jobs 조립"],
  ["finance infrastructure", "jobs infrastructure"],
  ["finance API", "jobs API"],
  ["finance/", "jobs/"],
  ["BENEFITS_ONTONG_API_KEY", ""],
];

for (const [src, dst] of [...pairs, ...morePairs]) {
  let t = readFileSync(join(base, src), "utf8");
  for (const [a, b] of [...rules, ...domainRules]) t = t.replaceAll(a, b);
  if (dst.includes("config.ts")) {
    t = t.replace(/ontongApiKey[^\n]*\n/g, "");
    t = t.replace(/^\s*:\s*z\.preprocess\(emptyToUndefined, z\.string\(\)\.optional\(\)\),\n/gm, "");
  }
  writeFileSync(join(base, dst), t);
  console.log("wrote", dst);
}
