"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_API_LOGIN } from "../routes";

export function AdminLoginForm(props: { nextPath: string }) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(ADMIN_API_LOGIN, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? "로그인하지 못했습니다.");
        return;
      }
      router.push(props.nextPath.startsWith("/") ? props.nextPath : "/admin");
      router.refresh();
    } catch {
      setError("로그인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="filters" onSubmit={submit}>
      <label className="field">
        <span>아이디</span>
        <input type="text" name="loginId" autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="hint" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}