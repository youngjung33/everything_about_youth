"use client";

import { useState } from "react";
import { LIVING_SYNC_API_PATH } from "../routes";

export function LivingSyncButton(props: { source?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`${LIVING_SYNC_API_PATH}${props.source ? `?source=${props.source}` : ""}`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(json?.error?.message ?? `실패 (${res.status})`);
        return;
      }
      setMessage("수집을 시작했습니다. 잠시 후 새로고침하세요.");
    } catch {
      setMessage("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "…" : (props.label ?? "수집")}
      </button>
      {message ? <em className="hint"> {message}</em> : null}
    </span>
  );
}
