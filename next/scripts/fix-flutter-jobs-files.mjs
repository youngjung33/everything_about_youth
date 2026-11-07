import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "..", "..", "flutter");

const fileRenames = new Map([
  ["finance_filters.dart", "jobs_filters.dart"],
  ["finance_meta.dart", "jobs_meta.dart"],
  ["finance_posting.dart", "job_posting.dart"],
  ["finance_repository.dart", "jobs_repository.dart"],
  ["finance_filter_presets.dart", "jobs_filter_presets.dart"],
  ["finance_routes.dart", "jobs_routes.dart"],
  ["scheme_list_state.dart", "posting_list_state.dart"],
  ["scheme_schedule.dart", "posting_schedule.dart"],
  ["scheme_detail_page.dart", "posting_detail_page.dart"],
  ["scheme_list_page.dart", "posting_list_page.dart"],
  ["scheme_schedule_page.dart", "posting_schedule_page.dart"],
  ["scheme_card.dart", "posting_card.dart"],
  ["saved_schemes_page.dart", "saved_postings_page.dart"],
  ["api_finance_repository.dart", "api_jobs_repository.dart"],
  ["mapping_finance_repository.dart", "mapping_jobs_repository.dart"],
  ["get_scheme_detail.dart", "get_job_posting_detail.dart"],
  ["search_schemes.dart", "search_job_postings.dart"],
  ["load_finance_meta.dart", "load_jobs_meta.dart"],
  ["load_schedule_schemes.dart", "load_schedule_postings.dart"],
  ["load_similar_schemes.dart", "load_similar_postings.dart"],
  ["load_saved_scheme_summaries.dart", "load_saved_posting_summaries.dart"],
  ["toggle_saved_scheme.dart", "toggle_saved_posting.dart"],
  ["paginated_scheme_list.dart", "paginated_posting_list.dart"],
]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith(".dart")) files.push(p);
  }
  return files;
}

const targets = [join(root, "lib", "features", "jobs"), join(root, "test", "features", "jobs"), join(root, "test", "support")];

for (const base of targets) {
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    const baseName = file.split(/[/\\]/).pop();
    const mapped = fileRenames.get(baseName);
    if (mapped) {
      const out = join(dirname(file), mapped);
      if (out !== file) {
        try {
          renameSync(file, out);
        } catch {
          /* already */
        }
      }
    }
  }
}

const rules = [
  ["finance_filters", "jobs_filters"],
  ["finance_meta", "jobs_meta"],
  ["finance_posting", "job_posting"],
  ["finance_repository", "jobs_repository"],
  ["finance_filter_presets", "jobs_filter_presets"],
  ["finance_routes", "jobs_routes"],
  ["api_finance_repository", "api_jobs_repository"],
  ["mapping_finance_repository", "mapping_jobs_repository"],
  ["load_finance_meta", "load_jobs_meta"],
  ["get_scheme_detail", "get_job_posting_detail"],
  ["search_schemes", "search_job_postings"],
  ["load_schedule_schemes", "load_schedule_postings"],
  ["load_similar_schemes", "load_similar_postings"],
  ["load_saved_scheme_summaries", "load_saved_posting_summaries"],
  ["toggle_saved_scheme", "toggle_saved_posting"],
  ["paginated_scheme_list", "paginated_posting_list"],
  ["scheme_list_state", "posting_list_state"],
  ["scheme_schedule", "posting_schedule"],
  ["scheme_detail_page", "posting_detail_page"],
  ["scheme_list_page", "posting_list_page"],
  ["scheme_schedule_page", "posting_schedule_page"],
  ["scheme_card", "posting_card"],
  ["saved_schemes_page", "saved_postings_page"],
  ["GetSchemeDetail", "GetJobPostingDetail"],
  ["SearchSchemes", "SearchJobPostings"],
  ["FinanceScheme", "JobPosting"],
  ["jobsHireTypeFilterPresets", "jobsHireTypeFilterPresets"],
  ["jeonse_loan", "public_corp"],
  ["lease_deposit", "youth"],
  ["housing_savings", "new_grad"],
  ["/finance/", "/jobs/"],
  ["ServiceCopy.jobsDetailVerificationFooter", "ServiceCopy.financeDetailVerificationFooter"],
];

for (const base of targets) {
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    if (!file.includes("jobs")) continue;
    let t = readFileSync(file, "utf8");
    const before = t;
    for (const [a, b] of rules) t = t.replaceAll(a, b);
    if (t !== before) writeFileSync(file, t);
  }
}

console.log("flutter jobs files fixed");
