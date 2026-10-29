import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..", "..");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...collectTsFiles(path));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const importRe = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const result: string[] = [];
  for (const m of source.matchAll(importRe)) result.push(m[1]!);
  return result;
}

/** app·배경 작업·housing presentation 은 infrastructure 구현을 직접 import 하지 않는다. */
const ENTRY_GLOBS = [
  join(ROOT, "src", "app"),
  join(ROOT, "src", "background-jobs.ts"),
  join(ROOT, "src", "features", "housing", "presentation"),
];

const forbiddenHousingInfra = [
  "@/features/housing/infrastructure/container",
  "@/features/housing/infrastructure/config",
  "@/features/housing/infrastructure/",
];

describe("housing 조립 경계", () => {
  it("app·presentation·background-jobs 는 housing infrastructure 를 직접 import 하지 않는다", () => {
    const files: string[] = [];
    for (const entry of ENTRY_GLOBS) {
      try {
        const st = statSync(entry);
        if (st.isDirectory()) files.push(...collectTsFiles(entry));
        else files.push(entry);
      } catch {
        /* optional path */
      }
    }

    const bad: string[] = [];
    for (const file of files) {
      for (const target of importsOf(file)) {
        if (forbiddenHousingInfra.some((p) => target.startsWith(p) || target === p.replace(/\/$/, ""))) {
          bad.push(`${relative(ROOT, file)}  ->  ${target}`);
        }
      }
    }
    expect(bad, `\n${bad.join("\n")}\n\n조립은 @/features/housing/housing-container 를 통하세요.`).toEqual([]);
  });

  it("housing-container re-export 가 존재한다", () => {
    const path = join(ROOT, "src", "features", "housing", "housing-container.ts");
    const source = readFileSync(path, "utf8");
    expect(source).toContain("getHousingContainer");
    expect(source).toContain("./infrastructure/container");
  });
});
