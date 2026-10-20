/**
 * 앱 버전 (`1.2.3`, 빌드 번호 `1.2.3+4` 와 `-beta` 같은 꼬리는 무시한다).
 * 숫자 세 개로 비교한다. 형식이 맞지 않으면 null.
 */
export type AppVersion = readonly [major: number, minor: number, patch: number];

export function parseAppVersion(raw: string | null | undefined): AppVersion | null {
  if (!raw) return null;
  const match = /^\s*(\d{1,6})\.(\d{1,6})(?:\.(\d{1,6}))?(?:[+-].*)?\s*$/.exec(raw);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

export function formatAppVersion(version: AppVersion): string {
  return version.join(".");
}

/** a < b 이면 음수, 같으면 0, a > b 이면 양수 */
export function compareAppVersions(a: AppVersion, b: AppVersion): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return 0;
}
