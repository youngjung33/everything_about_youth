import path from "node:path";
import dotenv from "dotenv";

/** Next.js 와 같은 우선순위로 .env.local → .env 를 읽는다. (이미 설정된 환경변수는 덮어쓰지 않음) */
export function loadEnv(): void {
  const root = process.cwd();
  dotenv.config({ path: path.join(root, ".env.local"), quiet: true });
  dotenv.config({ path: path.join(root, ".env"), quiet: true });
}
