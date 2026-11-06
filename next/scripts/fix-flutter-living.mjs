/**
 * Fix living flutter module naming after bootstrap.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..", "flutter");
const dirs = [join(root, "lib", "features", "living"), join(root, "test", "features", "living"), join(root, "test", "support")];

const replacements = [
  ["finance_scheme.dart", "living_guide.dart"],
  ["finance_filters.dart", "living_filters.dart"],
  ["finance_meta.dart", "living_meta.dart"],
  ["SchemePage", "GuidePage"],
  ["SchemeDetail", "GuideDetail"],
  ["SchemeSummary", "GuideSummary"],
  ["SavedSchemeList", "SavedGuideList"],
  ["SchemeSource", "GuideSource"],
  ["SchemeStatus", "GuideStatus"],
  ["searchSchemes", "searchGuides"],
  ["getScheme", "getGuide"],
  ["saveScheme", "saveGuide"],
  ["unsaveScheme", "unsaveGuide"],
  ["'/living/schemes", "'/living/guides"],
  ['"/living/schemes', '"/living/guides'],
  ["/schemes/", "/guides/"],
  ["SchemeListPage", "GuideListPage"],
  ["SchemeDetailPage", "GuideDetailPage"],
  ["SchemeSchedulePage", "GuideSchedulePage"],
  ["SavedSchemesPage", "SavedGuidesPage"],
  ["SavedSchemeButton", "SavedGuideButton"],
  ["schemeId", "guideId"],
  ["SchemeBadges", "GuideBadges"],
  ["scheme_card.dart", "guide_card.dart"],
  ["SchemeCard", "GuideCard"],
  ["programDetailProvider", "guideDetailProvider"],
  ["categories", "procedureTypes"],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "living_scheme.dart") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.dart$/.test(name)) files.push(p);
  }
  return files;
}

for (const dir of dirs) {
  try {
    for (const file of walk(dir)) {
      let s = readFileSync(file, "utf8");
      for (const [a, b] of replacements) s = s.replaceAll(a, b);
      writeFileSync(file, s);
    }
  } catch {
    /* missing dir */
  }
}

const dead = join(root, "lib", "features", "living", "domain", "living_scheme.dart");
try {
  unlinkSync(dead);
} catch {
  /* ok */
}

console.log("living flutter names fixed");
