"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HOUSING_SYNC_API_PATH } from "../routes";

interface SyncResponse {
  results?: Array<{ source: string; status: string; fetched: number; inserted: number; updated: number; error?: string }>;
  /** 통합 오류 템플릿: { error: { code, message } } */
  error?: { code?: string; message?: string };
}

export function SyncButton(props: { source?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${HOUSING_SYNC_API_PATH}${props.source ? `?source=${props.source}` : ""}`, { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok || data.error) {
        setMessage(`실패: ${data.error?.message ?? res.statusText}`);
      } else {
        setMessage(
          (data.results ?? [])
            .map((r) => `${r.source}: ${r.status}${r.status === "success" ? ` (신규 ${r.inserted}, 갱신 ${r.updated})` : r.error ? ` - ${r.error}` : ""}`)
            .join(" / "),
        );
        router.refresh();
      }
    } catch (e) {
      setMessage(`실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="sync-inline">
      <button type="button" className="btn primary" onClick={run} disabled={busy}>
        {busy ? "수집 중…" : (props.label ?? "지금 수집")}
      </button>
      {message && <span className="hint">{message}</span>}
    </span>
  );
}
