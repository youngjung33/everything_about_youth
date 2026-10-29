import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * 구조 규칙
 *
 *   src/common/            모든 섹션이 공유하는 코드 (섹션을 알지 못함)
 *   src/features/<name>/   섹션 하나의 모든 코드 (domain / application / infrastructure / presentation)
 *   src/app/               Next.js 라우트 (조립만 담당)
 *
 * 1) 레이어 경계 (common 과 각 feature 안에서 동일하게 적용): 의존성은 항상 안쪽(domain)으로만 향한다.
 *      domain  <-  application  <-  infrastructure / presentation
 * 2) 섹션 경계: common 은 features 를 import 할 수 없고, feature 는 다른 feature 를 import 할 수 없다.
 */
const FEATURES = ["housing", "benefits", "finance", "jobs", "living"];

const FRAMEWORK_PACKAGES = [
  "next",
  "next/*",
  "react",
  "react-dom",
  "drizzle-orm",
  "drizzle-orm/*",
  "better-sqlite3",
  "cheerio",
  "fast-xml-parser",
  "zod",
  "dotenv",
];

const LAYERS = {
  domain: {
    forbid: ["**/application/**", "**/infrastructure/**", "**/presentation/**", "@/app/**", ...FRAMEWORK_PACKAGES],
    message: "domain 레이어는 순수해야 합니다. 바깥 레이어와 프레임워크를 import 할 수 없습니다.",
  },
  application: {
    forbid: ["**/infrastructure/**", "**/presentation/**", "@/app/**", ...FRAMEWORK_PACKAGES],
    message: "application 레이어는 domain(과 common 의 domain/application)만 import 할 수 있습니다.",
  },
  infrastructure: {
    forbid: ["**/presentation/**", "@/app/**", "next", "next/*", "react", "react-dom"],
    message: "infrastructure 레이어는 presentation/app/UI 프레임워크를 import 할 수 없습니다.",
  },
  presentation: {
    forbid: [
      "**/infrastructure/sources/**",
      "**/infrastructure/persistence/**",
      "**/infrastructure/http/**",
      "**/infrastructure/crawler/**",
      "better-sqlite3",
      "drizzle-orm",
      "drizzle-orm/*",
    ],
    message: "presentation/app 은 infrastructure 구현(persistence·sources·crawler)을 import 할 수 없습니다. container·domain 을 통하세요.",
  },
};

const SCOPES = [
  { dir: "src/common", forbid: ["@/features/**", "**/features/**"], message: "common 은 특정 섹션(features)에 의존할 수 없습니다." },
  ...FEATURES.map((name) => ({
    dir: `src/features/${name}`,
    forbid: FEATURES.filter((f) => f !== name).map((f) => `@/features/${f}/**`),
    message: "섹션(feature)끼리 직접 import 할 수 없습니다. 공통 코드는 src/common 으로 옮기세요.",
  })),
];

const restrict = (patterns) => ({
  files: patterns.files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: patterns.groups.filter((g) => g.group.length > 0),
      },
    ],
  },
});

const boundaryRules = [];
for (const scope of SCOPES) {
  for (const [layer, def] of Object.entries(LAYERS)) {
    boundaryRules.push(
      restrict({
        files: [`${scope.dir}/**/${layer}/**/*.{ts,tsx}`],
        groups: [
          { group: def.forbid, message: def.message },
          { group: scope.forbid, message: scope.message },
        ],
      }),
    );
  }
}
// 라우트(app)는 presentation 과 같은 규칙
boundaryRules.push(
  restrict({
    files: ["src/app/**/*.{ts,tsx}"],
    groups: [{ group: LAYERS.presentation.forbid, message: LAYERS.presentation.message }],
  }),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaryRules,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "data/**", "drizzle/**"]),
]);

export default eslintConfig;
