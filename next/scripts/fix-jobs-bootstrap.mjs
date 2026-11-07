import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const roots = [
  join(import.meta.dirname, "..", "src", "features", "jobs"),
  join(import.meta.dirname, "..", "src", "app", "api", "v1", "jobs"),
  join(import.meta.dirname, "..", "scripts", "jobs"),
  join(import.meta.dirname, "..", "src", "app", "jobs"),
  join(import.meta.dirname, "..", "src", "common", "presentation", "api", "schemas", "jobs-schemas.ts"),
];

const replacements = [
  ["scheme-repository", "posting-repository"],
  ["scheme-source", "posting-source"],
  ["saved-scheme-repository", "saved-posting-repository"],
  ["search-schemes", "search-job-postings"],
  ["get-scheme-detail", "get-job-posting-detail"],
  ["sync-schemes-from-source", "sync-job-postings-from-source"],
  ["manage-saved-schemes", "manage-saved-postings"],
  ["sqlite-scheme-repository", "sqlite-posting-repository"],
  ["sqlite-saved-scheme-repository", "sqlite-saved-posting-repository"],
  ["financeSchemes", "jobPostings"],
  ["financeSchemeRegions", "jobPostingRegions"],
  ["financeSchemeTags", "jobPostingTags"],
  ["financeSchemeSources", "jobPostingSources"],
  ["savedFinanceSchemes", "savedJobPostings"],
  ["financeSyncRuns", "jobsSyncRuns"],
  ["FinanceOverrides", "JobsOverrides"],
  ["manageSavedSchemes", "manageSavedPostings"],
  ["FinanceApiDeps", "JobsApiDeps"],
  ["SchemeListItem", "PostingListItem"],
  ["SchemeSearchQuery", "PostingSearchQuery"],
  ["SchemeSort", "PostingSort"],
  ["SchemeFilters", "PostingFilters"],
  ["SavedScheme", "SavedPosting"],
  ["dedupeSchemeBatch", "dedupePostingBatch"],
  ["saved_finance_schemes", "saved_job_postings"],
  ["finance_schemes", "job_postings"],
  ["finance_scheme_", "job_posting_"],
  ["product_type_id", "hire_type_id"],
  ['JOBS_BASE = "/finance"', 'JOBS_BASE = "/jobs"'],
  ['JOBS_FEATURE_ID = "finance"', 'JOBS_FEATURE_ID = "jobs"'],
  ["features/finance", "features/jobs"],
  ["finance 조립", "jobs 조립"],
  ["finance infrastructure", "jobs infrastructure"],
  ["finance API handlers", "jobs API handlers"],
  ["UID:finance-", "UID:jobs-"],
  ['`finance-', '`jobs-'],
  ["/finance/admin", "/jobs/admin"],
  ["isOntongFinancePolicy", "isOntongJobsPolicy"],
  ["domain/scheme", "domain/job-posting"],
  ['from "./scheme"', 'from "./job-posting"'],
  ['from "../scheme"', 'from "../job-posting"'],
  ["getPostingStatus", "getJobPostingStatus"],
  ["fetchSchemes", "fetchPostings"],
  ["SchemeSourcePort", "JobPostingSourcePort"],
];

function walk(p, files = []) {
  if (!statSync(p, { throwIfNoEntry: false })?.isDirectory?.()) {
    files.push(p);
    return files;
  }
  for (const name of readdirSync(p)) walk(join(p, name), files);
  return files;
}

const files = [];
for (const r of roots) {
  try {
    const st = statSync(r);
    if (st.isDirectory()) files.push(...walk(r));
    else files.push(r);
  } catch {
    /* skip */
  }
}

for (const file of files) {
  if (!/\.(ts|tsx|md)$/.test(file)) continue;
  let text = readFileSync(file, "utf8");
  const before = text;
  for (const [a, b] of replacements) text = text.replaceAll(a, b);
  // container property naming
  text = text.replace(/\bschemes:\s*JobPostingRepository/g, "postings: JobPostingRepository");
  text = text.replace(/const \{ schemes,/g, "const { postings,");
  text = text.replace(/createJobsRepositories\(common\.persistence\);\s*\n\n\s*const \{ schemes,/g, (m) => m.replace("schemes", "postings"));
  text = text.replace(/new SearchJobPostings\(schemes,/g, "new SearchJobPostings(postings,");
  text = text.replace(/new GetJobPostingDetail\(schemes,/g, "new GetJobPostingDetail(postings,");
  text = text.replace(/new ManageSavedJobPostings\(savedPostings, schemes,/g, "new ManageSavedJobPostings(savedPostings, postings,");
  text = text.replace(/SyncJobPostingsFromSource\(active, schemes,/g, "SyncJobPostingsFromSource(active, postings,");
  if (text !== before) writeFileSync(file, text);
}

console.log("fixed", files.length, "paths");
