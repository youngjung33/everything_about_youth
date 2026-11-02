import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..", "flutter");

function walk(d, files = []) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith(".dart")) files.push(p);
  }
  return files;
}

const renames = [
  ["lib/features/finance/domain/finance_program.dart", "lib/features/finance/domain/finance_scheme.dart"],
  ["lib/features/finance/presentation/pages/program_detail_page.dart", "lib/features/finance/presentation/pages/scheme_detail_page.dart"],
  ["lib/features/finance/presentation/pages/scheme_list_page.dart", "lib/features/finance/presentation/pages/scheme_list_page.dart"],
  ["lib/features/finance/presentation/widgets/program_card.dart", "lib/features/finance/presentation/widgets/scheme_card.dart"],
];

for (const [a, b] of renames) {
  const fa = join(root, a);
  const fb = join(root, b);
  if (existsSync(fa) && fa !== fb) {
    try {
      renameSync(fa, fb);
    } catch {
      /* ok */
    }
  }
}

const reps = [
  ["benefit_program.dart", "finance_scheme.dart"],
  ["benefits_repository.dart", "finance_repository.dart"],
  ["benefits_routes.dart", "finance_routes.dart"],
  ["benefits_container.dart", "finance_container.dart"],
  ["benefitsContainerProvider", "financeContainerProvider"],
  ["benefitsMetaProvider", "financeMetaProvider"],
  ["programListProvider", "schemeListProvider"],
  ["savedProgramsProvider", "savedSchemesProvider"],
  ["similarProgramsProvider", "similarSchemesProvider"],
  ["benefitsScheduleProgramsProvider", "financeScheduleSchemesProvider"],
  ["FinanceProgram", "FinanceScheme"],
  ["program_list_state.dart", "scheme_list_state.dart"],
  ["program_schedule.dart", "scheme_schedule.dart"],
  ["search_programs.dart", "search_schemes.dart"],
  ["get_program_detail.dart", "get_scheme_detail.dart"],
  ["load_similar_programs.dart", "load_similar_schemes.dart"],
  ["load_schedule_programs.dart", "load_schedule_schemes.dart"],
  ["paginated_program_list.dart", "paginated_scheme_list.dart"],
  ["saved_program_reminder", "saved_scheme_reminder"],
  ["ProgramCard", "SchemeCard"],
  ["ProgramListPage", "SchemeListPage"],
  ["ProgramDetailPage", "SchemeDetailPage"],
  ["ProgramSchedulePage", "SchemeSchedulePage"],
  ["SavedProgramsPage", "SavedSchemesPage"],
  ["/programs/", "/schemes/"],
  ["'/programs/", "'/schemes/"],
  ["programs/:id", "schemes/:id"],
  ["FinanceRoutes.program", "FinanceRoutes.scheme"],
  ["static String program", "static String scheme"],
  ["benefits/", "finance/"],
  ["Benefits", "Finance"],
  ["programId", "schemeId"],
  ["ProgramPage", "SchemePage"],
  ["ProgramDetail", "SchemeDetail"],
  ["program:", "scheme:"],
  ["program.", "scheme."],
  ["program)", "scheme)"],
  ["program,", "scheme,"],
  ["program ", "scheme "],
  ["programs", "schemes"],
  ["Program", "Scheme"],
];

const dirs = [
  join(root, "lib", "features", "finance"),
  join(root, "test", "features", "finance"),
  join(root, "test", "support"),
];

for (const dir of dirs) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (!file.includes(`${join("features", "finance")}`) && !file.includes("finance_fixtures") && !file.includes("finance_memory")) continue;
    let s = readFileSync(file, "utf8");
    for (const [a, b] of reps) s = s.split(a).join(b);
    writeFileSync(file, s);
  }
}

console.log("flutter finance pass2 done");
