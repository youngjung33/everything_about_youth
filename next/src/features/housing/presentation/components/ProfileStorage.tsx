"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isHousingPath } from "../routes";

const STORAGE_KEY = "eay.profile.v1";
const PROFILE_KEYS = ["age", "home", "married", "newlywed", "student", "income"] as const;

/**
 * '내 조건'을 localStorage 에 보관한다 (로그인 없는 1차 버전).
 *  - URL 에 p=1 이 있으면 폼을 제출한 것이므로 현재 조건을 저장한다(비어 있으면 삭제).
 *  - p 가 없고 저장된 조건이 있으면 URL 에 복원해 서버가 판정할 수 있게 한다.
 * 서버는 localStorage 를 읽을 수 없으므로 URL 이 서버에 전달되는 유일한 통로다.
 */
export function ProfileStorage() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isHousingPath(pathname)) return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (params.get("p") === "1") {
      const profile: Record<string, string> = {};
      for (const key of PROFILE_KEYS) {
        const v = params.get(key);
        if (v) profile[key] = v;
      }
      try {
        if (Object.keys(profile).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* 저장소 사용 불가(시크릿 모드 등)는 무시 */
      }
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const profile = JSON.parse(saved) as Record<string, string>;
      let changed = false;
      for (const key of PROFILE_KEYS) {
        if (profile[key] && !params.has(key)) {
          params.set(key, profile[key]);
          changed = true;
        }
      }
      if (changed) router.replace(`${url.pathname}?${params.toString()}`);
    } catch {
      /* 깨진 저장값은 무시 */
    }
  }, [pathname, router]);

  return null;
}
