import { z } from "zod";
import type { AppPolicy } from "@/common/application/app-policy";
import { compareAppVersions, parseAppVersion, type AppVersion } from "@/common/domain/app-version";
import { emptyToUndefined } from "./env";

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional());

const schema = z.object({
  APP_MIN_VERSION: optionalText,
  APP_LATEST_VERSION: optionalText,
  APP_STORE_URL_ANDROID: optionalUrl,
  APP_STORE_URL_IOS: optionalUrl,
  APP_UPDATE_MESSAGE: optionalText,
});

function version(name: string, raw: string | undefined, fallback: AppVersion): AppVersion {
  if (raw === undefined) return fallback;
  const parsed = parseAppVersion(raw);
  if (!parsed) throw new Error(`${name} 형식이 올바르지 않습니다: "${raw}" (예: 1.2.0)`);
  return parsed;
}

/**
 * 앱 버전 정책을 환경 변수에서 읽는다. 값을 바꾸고 서버를 다시 시작하면 반영된다.
 *
 * - APP_MIN_VERSION       이 버전 미만의 앱은 강제 업데이트 (기본 0.0.0 = 아무도 막지 않음)
 * - APP_LATEST_VERSION    스토어의 최신 버전 (기본: 최소 버전)
 * - APP_STORE_URL_ANDROID / APP_STORE_URL_IOS   업데이트 버튼이 여는 스토어 주소
 * - APP_UPDATE_MESSAGE    업데이트 화면의 안내 문구 (선택)
 *
 * 잘못 적힌 값은 조용히 무시하지 않고 오류로 알린다. (무시하면 강제 업데이트가 조용히 꺼진다)
 */
export function loadAppPolicy(env: Record<string, string | undefined> = process.env): AppPolicy {
  const parsed = schema.parse(env);
  const min = version("APP_MIN_VERSION", parsed.APP_MIN_VERSION, [0, 0, 0]);
  const latestRaw = version("APP_LATEST_VERSION", parsed.APP_LATEST_VERSION, min);

  return {
    minVersion: min,
    // 최신이 최소보다 낮게 적혀 있어도 모순되지 않게 맞춘다.
    latestVersion: compareAppVersions(latestRaw, min) < 0 ? min : latestRaw,
    storeUrls: { android: parsed.APP_STORE_URL_ANDROID ?? null, ios: parsed.APP_STORE_URL_IOS ?? null },
    message: parsed.APP_UPDATE_MESSAGE ?? null,
  };
}
