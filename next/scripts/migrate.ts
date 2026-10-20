import { loadConfig } from "@/common/infrastructure/config/env";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { loadEnv } from "./load-env";

loadEnv();
const config = loadConfig();
const conn = openSqlite(config.sqlitePath);
runMigrations(conn.db);
conn.close();
console.log(`마이그레이션 완료: ${config.sqlitePath}`);
