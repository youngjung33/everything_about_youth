"use client";

import { useState } from "react";
import { ADMIN_API_PASSWORD } from "../routes";

export function AdminPasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(ADMIN_API_PASSWORD, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMessage(data.error?.message ?? "변경하지 못했습니다.");
        return;
      }
      setMessage("비밀번호를 변경했습니다.");
      setCurrent("");
      setNew("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="filters" onSubmit={submit}>
      <label className="field">
        <span>현재 비밀번호</span>
        <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </label>
      <label className="field">
        <span>새 비밀번호 (6자 이상)</span>
        <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
      </label>
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? "저장 중…" : "저장"}
      </button>
      {message && <p className="hint">{message}</p>}
    </form>
  );
}