"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { mergeSavedProfileIntoSearchParams, pickProfileForStorage } from "../profile-storage-utils";
import { isHousingPath } from "../routes";

const STORAGE_KEY = "eay.profile.v1";

/**
 * '내 조건'을 localStorage 에 보관한다 (로그인 없는 1차 버전).
 *  - URL 에 p=1 이 있으면 폼을 제출한 것이므로 현재 조건을 저장한다(비어 있으면 삭제).
 *  - p 가 없고 저장된 조건이 있으면 URL 에 복원해 서버가 판정할 수 있게 한다.
 * 서버는 localStorage 를 읽을 수 없으므로 URL 이 서버에 전달되는 유일한 통로다.
 *  - 복원은 한 틱 뒤에 한다. 사용자가 링크(공고 상세 등)를 누르는 순간에는 취소해 router.replace 가 내비게이션을 가로채지 않게 한다.
 */
export function ProfileStorage() {
  const pathname = usePathname();
  const router = useRouter();
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRestore = useRef(false);

  useEffect(() => {
    if (!isHousingPath(pathname)) return;
    suppressRestore.current = false;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (params.get("p") === "1") {
      const profile = pickProfileForStorage(params);
      try {
        if (Object.keys(profile).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* 저장소 사용 불가(시크릿 모드 등)는 무시 */
      }
      return;
    }

    const clearPendingRestore = () => {
      if (restoreTimer.current !== null) {
        clearTimeout(restoreTimer.current);
        restoreTimer.current = null;
      }
    };

    const cancelRestoreOnLink = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("a[href]")) return;
      suppressRestore.current = true;
      clearPendingRestore();
    };

    restoreTimer.current = setTimeout(() => {
      restoreTimer.current = null;
      if (suppressRestore.current) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const profile = JSON.parse(saved) as Record<string, string>;
        const restoreUrl = new URL(window.location.href);
        if (!mergeSavedProfileIntoSearchParams(restoreUrl.searchParams, profile)) return;
        router.replace(`${restoreUrl.pathname}?${restoreUrl.searchParams.toString()}`, { scroll: false });
      } catch {
        /* 깨진 저장값은 무시 */
      }
    }, 0);

    window.addEventListener("pointerdown", cancelRestoreOnLink, true);

    return () => {
      clearPendingRestore();
      window.removeEventListener("pointerdown", cancelRestoreOnLink, true);
    };
  }, [pathname, router]);

  return null;
}
