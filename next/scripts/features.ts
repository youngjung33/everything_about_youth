/**
 * 서비스 켜기/끄기 CLI (서버가 관리한다)
 *   npm run features                       # 목록과 현재 상태
 *   npm run features -- off housing        # 임대주택 끄기 (앱에서 숨김 + API 503)
 *   npm run features -- on housing         # 켜기
 *   npm run features -- reset housing      # 운영자가 바꾼 값을 지우고 기본값으로
 *
 * 서버와 같은 DB(SQLITE_PATH)를 고치므로 서버를 다시 시작할 필요가 없다.
 * 앱은 다음에 시작할 때(또는 서버 값을 다시 받을 때) 반영한다.
 */
import { createCommonContainer } from "@/common/infrastructure/container";
import { UnknownFeatureError } from "@/common/application/feature-flags";
import { createFeatureFlags } from "@/features/registry";
import { loadEnv } from "./load-env";

async function main() {
  loadEnv();
  const common = createCommonContainer();
  const flags = createFeatureFlags(common);
  try {
    const [command, id] = process.argv.slice(2);

    if (command === "on" || command === "off" || command === "reset") {
      if (!id) throw new Error(`서비스 id 가 필요합니다. 예) npm run features -- ${command} housing`);
      if (command === "reset") await flags.reset(id);
      else await flags.set(id, command === "on");
    } else if (command !== undefined) {
      throw new Error(`알 수 없는 명령입니다: ${command} (on | off | reset)`);
    }

    for (const s of await flags.list()) {
      const state = s.enabled ? "켜짐" : "꺼짐";
      const origin = s.overridden ? `운영자 설정 (기본값 ${s.defaultEnabled ? "켜짐" : "꺼짐"})` : "기본값";
      console.log(`${s.id.padEnd(12)} ${state.padEnd(4)} ${origin}`);
    }
  } finally {
    common.close();
  }
}

main().catch((e) => {
  console.error(e instanceof UnknownFeatureError || e instanceof Error ? e.message : e);
  process.exit(1);
});
