import { z } from "zod";
import type { RedirectRules } from "@/common/application/sso";
import { emptyToUndefined } from "./env";

/** 앱이 로그인 뒤에 돌아오는 주소(커스텀 스킴). 앱의 Android/iOS 설정과 `kSsoAppRedirect` 가 같은 값을 쓴다. */
export const DEFAULT_APP_REDIRECT = "everythingaboutyouth://auth";

const text = z.preprocess(emptyToUndefined, z.string().trim().optional());

const schema = z.object({
  SSO_PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional()),
  SSO_ALLOWED_REDIRECTS: text,
  SSO_GOOGLE_CLIENT_ID: text,
  SSO_GOOGLE_CLIENT_SECRET: text,
  SSO_APPLE_CLIENT_ID: text,
  SSO_APPLE_TEAM_ID: text,
  SSO_APPLE_KEY_ID: text,
  SSO_APPLE_PRIVATE_KEY: text,
  SSO_NAVER_CLIENT_ID: text,
  SSO_NAVER_CLIENT_SECRET: text,
  SSO_KAKAO_CLIENT_ID: text,
  SSO_KAKAO_CLIENT_SECRET: text,
});

export interface SsoConfig {
  /** 로그인 업체가 돌아올 서버의 바깥 주소. 없으면 요청의 origin 을 쓴다. */
  publicBaseUrl: string | null;
  redirects: RedirectRules;
  providers: {
    google?: { clientId: string; clientSecret: string };
    apple?: { clientId: string; teamId: string; keyId: string; privateKey: string };
    naver?: { clientId: string; clientSecret: string };
    kakao?: { clientId: string; clientSecret: string | null };
  };
  /** 일부만 적힌 설정처럼, 조용히 넘기면 안 되는 문제. 해당 업체는 꺼진다. */
  problems: string[];
}

/**
 * SSO 설정을 환경 변수에서 읽는다. **키가 모두 있는 업체만 켜지고**, 나머지는 로그인 화면에서 "준비 중"이다.
 *
 * | 업체 | 필요한 값 |
 * | --- | --- |
 * | Google | SSO_GOOGLE_CLIENT_ID, SSO_GOOGLE_CLIENT_SECRET |
 * | Apple  | SSO_APPLE_CLIENT_ID(Services ID), SSO_APPLE_TEAM_ID, SSO_APPLE_KEY_ID, SSO_APPLE_PRIVATE_KEY(.p8 내용, 줄바꿈은 \n) |
 * | 네이버 | SSO_NAVER_CLIENT_ID, SSO_NAVER_CLIENT_SECRET |
 * | 카카오 | SSO_KAKAO_CLIENT_ID(REST API 키), SSO_KAKAO_CLIENT_SECRET(콘솔에서 켰을 때만) |
 *
 * 그 밖에: SSO_PUBLIC_BASE_URL(업체 콘솔에 등록한 서버 주소), SSO_ALLOWED_REDIRECTS(앱이 돌아올 주소, 콤마 구분).
 * 일부만 적힌 업체(예: Google 의 ID 만 있고 SECRET 이 없음)는 켜지 않고 `problems` 로 알린다.
 */
export function loadSsoConfig(env: Record<string, string | undefined> = process.env): SsoConfig {
  const e = schema.parse(env);
  const problems: string[] = [];

  /**
   * 모두 있으면 그 값들, 하나도 없으면 null(준비 중), 일부만 있으면 null 이고 문제로 기록한다.
   * `fields` 는 `필드 이름: [환경 변수 이름, 값]` 이다. 문제 문구에는 운영자가 바로 고칠 수 있게 환경 변수 이름을 쓴다.
   */
  function group<K extends string>(name: string, fields: Record<K, [string, string | undefined]>): Record<K, string> | null {
    const entries = Object.entries(fields) as [K, [string, string | undefined]][];
    const present = entries.filter(([, [, v]]) => v !== undefined);
    if (present.length === 0) return null;
    if (present.length < entries.length) {
      const missing = entries.filter(([, [, v]]) => v === undefined).map(([, [envName]]) => envName);
      problems.push(`${name} 로그인 설정이 일부만 있어 사용하지 않습니다. 빠진 값: ${missing.join(", ")}`);
      return null;
    }
    return Object.fromEntries(entries.map(([k, [, v]]) => [k, v as string])) as Record<K, string>;
  }

  const google = group("Google", {
    clientId: ["SSO_GOOGLE_CLIENT_ID", e.SSO_GOOGLE_CLIENT_ID],
    clientSecret: ["SSO_GOOGLE_CLIENT_SECRET", e.SSO_GOOGLE_CLIENT_SECRET],
  });
  const apple = group("Apple", {
    clientId: ["SSO_APPLE_CLIENT_ID", e.SSO_APPLE_CLIENT_ID],
    teamId: ["SSO_APPLE_TEAM_ID", e.SSO_APPLE_TEAM_ID],
    keyId: ["SSO_APPLE_KEY_ID", e.SSO_APPLE_KEY_ID],
    privateKey: ["SSO_APPLE_PRIVATE_KEY", e.SSO_APPLE_PRIVATE_KEY],
  });
  const naver = group("네이버", {
    clientId: ["SSO_NAVER_CLIENT_ID", e.SSO_NAVER_CLIENT_ID],
    clientSecret: ["SSO_NAVER_CLIENT_SECRET", e.SSO_NAVER_CLIENT_SECRET],
  });

  const extra = (e.SSO_ALLOWED_REDIRECTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    publicBaseUrl: e.SSO_PUBLIC_BASE_URL ? e.SSO_PUBLIC_BASE_URL.replace(/\/+$/, "") : null,
    redirects: {
      allowed: [DEFAULT_APP_REDIRECT, ...extra],
      allowLocalhost: env.NODE_ENV !== "production",
    },
    providers: {
      ...(google ? { google } : {}),
      ...(apple ? { apple: { ...apple, privateKey: apple.privateKey.replace(/\\n/g, "\n") } } : {}),
      ...(naver ? { naver } : {}),
      ...(e.SSO_KAKAO_CLIENT_ID
        ? { kakao: { clientId: e.SSO_KAKAO_CLIENT_ID, clientSecret: e.SSO_KAKAO_CLIENT_SECRET ?? null } }
        : {}),
    },
    problems: [
      ...problems,
      ...(!e.SSO_KAKAO_CLIENT_ID && e.SSO_KAKAO_CLIENT_SECRET
        ? ["카카오 로그인 설정에 SSO_KAKAO_CLIENT_ID 가 없어 사용하지 않습니다."]
        : []),
    ],
  };
}
