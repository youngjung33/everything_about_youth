"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_API_LOGOUT } from "../routes";

/** 관리자 세션 쿠키 삭제 후 로그인 화면으로 */
export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch(ADMIN_API_LOGOUT, { method: "POST", credentials: "include" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn" onClick={logout} disabled={busy}>
      {busy ? "로그아웃…" : "로그아웃"}
    </button>
  );
}