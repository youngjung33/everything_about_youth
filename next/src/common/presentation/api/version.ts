/**
 * API 버전. 앱과 서버가 주고받는 형식을 바꿀 때(호환이 깨질 때)만 올린다.
 *
 * - 모든 앱용 API 는 `/api/v1/...` 아래에 있다. (파일 위치: `src/app/api/v1/...`)
 * - 버전을 올릴 때는 `/api/v2` 를 새로 만들고 `SUPPORTED_API_VERSIONS` 에 더한다. 구버전 앱이 쓰는 v1 은 둔다.
 *   v1 을 닫을 때는 목록에서 빼면 v1 호출은 `API_VERSION_UNSUPPORTED`(앱이 업데이트 화면을 띄운다)가 된다.
 * - 앱은 이 문자열을 한 곳(`core/network/api_version.dart`)에서만 안다.
 */
export const API_VERSION = "v1";
export const SUPPORTED_API_VERSIONS: readonly string[] = [API_VERSION];

export const API_PREFIX = `/api/${API_VERSION}`;

/** `apiPath("/features")` → `/api/v1/features` */
export function apiPath(path: string): string {
  return `${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * `/api/v1/housing/notices` → `{ version: "v1", rest: "/housing/notices" }`
 * 버전이 없는 `/api/features` 는 version 이 null 이다.
 */
export function splitApiPath(pathname: string): { version: string | null; rest: string } | null {
  if (!pathname.startsWith("/api/") && pathname !== "/api") return null;
  const match = /^\/api\/(v\d+)(\/.*)?$/.exec(pathname);
  if (!match) return { version: null, rest: pathname.slice("/api".length) };
  return { version: match[1]!, rest: match[2] ?? "/" };
}
