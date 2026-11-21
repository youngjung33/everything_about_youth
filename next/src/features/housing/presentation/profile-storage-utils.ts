const PROFILE_KEYS = ["age", "home", "married", "newlywed", "student", "income"] as const;

/** localStorage '내 조건' 키 목록 */
export const PROFILE_STORAGE_KEYS = PROFILE_KEYS;

/**
 * 저장된 프로필 값을 URL 검색 파라미터에 넣는다. 이미 있는 키는 덮어쓰지 않는다.
 * @returns 하나라도 병합했으면 true
 */
export function mergeSavedProfileIntoSearchParams(
  params: URLSearchParams,
  saved: Record<string, string>,
): boolean {
  let changed = false;
  for (const key of PROFILE_KEYS) {
    if (saved[key] && !params.has(key)) {
      params.set(key, saved[key]);
      changed = true;
    }
  }
  return changed;
}

/**
 * 폼 제출(p=1) URL 에서 저장할 프로필만 추린다.
 */
export function pickProfileForStorage(params: URLSearchParams): Record<string, string> {
  const profile: Record<string, string> = {};
  for (const key of PROFILE_KEYS) {
    const v = params.get(key);
    if (v) profile[key] = v;
  }
  return profile;
}