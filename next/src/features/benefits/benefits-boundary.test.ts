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

const ENTRY_GLOBS = [
  join(ROOT, "src", "app"),
  join(ROOT, "src", "background-jobs.ts"),
  join(ROOT, "src", "features", "benefits", "presentation"),
];

const forbiddenBenefitsInfra = [
  "@/features/benefits/infrastructure/container",
  "@/features/benefits/infrastructure/config",
  "@/features/benefits/infrastructure/",
];

describe("benefits 조립 경계", () => {
  it("app·presentation·background-jobs 는 benefits infrastructure 를 직접 import 하지 않는다", () => {
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
        if (forbiddenBenefitsInfra.some((p) => target.startsWith(p) || target === p.replace(/\/$/, ""))) {
          bad.push(`${relative(ROOT, file)}  ->  ${target}`);
        }
      }
    }
    expect(bad, `\n${bad.join("\n")}\n\n조립은 @/features/benefits/benefits-container 를 통하세요.`).toEqual([]);
  });

  it("benefits-container re-export 가 존재한다", () => {
    const path = join(ROOT, "src", "features", "benefits", "benefits-container.ts");
    const source = readFileSync(path, "utf8");
    expect(source).toContain("getBenefitsContainer");
    expect(source).toContain("./infrastructure/container");
  });
});
