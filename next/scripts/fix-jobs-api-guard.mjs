import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "src", "app", "api", "v1", "jobs");

function walk(p, out = []) {
  for (const name of readdirSync(p)) {
    const full = join(p, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".ts")) out.push(full);
  }
  return out;
}

for (const file of walk(dir)) {
  let t = readFileSync(file, "utf8");
  const next = t.replaceAll("assertFinanceEnabled", "assertJobsEnabled");
  if (next !== t) writeFileSync(file, next);
}
