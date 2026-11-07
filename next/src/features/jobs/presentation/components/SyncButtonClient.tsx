"use client";

import dynamic from "next/dynamic";

/** 클라이언트 전용 로드 — 자동화 브라우저가 DOM에 속성을 넣어 SSR 버튼 하이드레이션이 깨지는 것을 피한다. */
export const JobsSyncButton = dynamic(
  () => import("./SyncButton").then((m) => m.JobsSyncButton),
  {
    ssr: false,
    loading: () => <span className="sync-inline hint">버튼 불러오는 중…</span>,
  },
);
