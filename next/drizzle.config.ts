import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  // 공용 스키마와 섹션(feature)별 스키마를 모두 모아 하나의 drizzle/ 마이그레이션으로 관리한다.
  schema: ["./src/common/infrastructure/persistence/sqlite/schema.ts", "./src/features/*/infrastructure/persistence/sqlite/schema.ts"],
  out: "./drizzle",
  dbCredentials: { url: process.env.SQLITE_PATH ?? "./data/app.db" },
});
