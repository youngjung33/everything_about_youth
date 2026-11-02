import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "src", "features", "finance");

function walk(d, files = []) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
  return files;
}

const reps = [
  ["ProgramStatus", "SchemeStatus"],
  ["PROGRAM_STATUSES", "SCHEME_STATUSES"],
  ["ProgramSort", "SchemeSort"],
  ["ProgramFilters", "SchemeFilters"],
  ["ProgramListItem", "SchemeListItem"],
  ["SavedProgram", "SavedScheme"],
  ["program-repository", "scheme-repository"],
  ["search-programs", "search-schemes"],
  ["saved-program-repository", "saved-scheme-repository"],
  ["getProgramDetail", "getSchemeDetail"],
  ["searchPrograms", "searchSchemes"],
  ["manageSavedPrograms", "manageSavedSchemes"],
  ["syncPrograms", "syncSchemes"],
  ["savedPrograms", "savedSchemes"],
  ["programs:", "schemes:"],
  ["programs,", "schemes,"],
  ["programs ", "schemes "],
  ["programs)", "schemes)"],
  ["programs.", "schemes."],
  ["programs;", "schemes;"],
  ["(programs", "(schemes"],
  ["[programs", "[schemes"],
  ["parseProductTypeId", "inferProductTypeFromText"],
  ["domain/program", "domain/scheme"],
  ["handleSaveProgram", "handleSaveScheme"],
  ["handleUnsaveProgram", "handleUnsaveScheme"],
  ["handleMergeSavedPrograms", "handleMergeSavedSchemes"],
  ["SaveProgramResult", "SaveSchemeResult"],
  ["toItem(program", "toItem(scheme"],
  ["BENEFITS_BASE", "FINANCE_BASE"],
  ["BENEFITS_SYNC", "FINANCE_SYNC"],
  ["isBenefitsPath", "isFinancePath"],
  ["/benefits", "/finance"],
  ["benefitsSyncQuerySchema", "financeSyncQuerySchema"],
  ["benefits-schemas", "finance-schemas"],
  ["UID:benefits-", "UID:finance-"],
  ["`benefits-", "`finance-"],
  ["dedupeBatch", "dedupeSchemeBatch"],
  ["export function dedupeSchemeBatch", "export function dedupeSchemeBatch"],
];

for (const file of walk(dir)) {
  let s = readFileSync(file, "utf8");
  for (const [a, b] of reps) s = s.replaceAll(a, b);
  writeFileSync(file, s);
}

const programPath = join(dir, "domain", "program.ts");
const schemePath = join(dir, "domain", "scheme.ts");
try {
  renameSync(programPath, schemePath);
} catch {
  /* ok */
}

console.log("fixed finance files");
