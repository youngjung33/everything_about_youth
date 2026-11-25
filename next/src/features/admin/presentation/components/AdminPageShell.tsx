import type { ReactNode } from "react";
import type { AdminSessionView } from "../../application/use-cases/verify-admin-session";
import { requireAdminSession } from "../admin-page-access";
import { AdminSidebar } from "./AdminSidebar";

/** 관리자 전용 페이지 래퍼(세션·왼쪽 사이드 네비·콘텐츠). */
export async function AdminPageShell(props: { children: ReactNode; session?: AdminSessionView }) {
  const session = props.session ?? (await requireAdminSession());
  return (
    <div className="admin-shell">
      <AdminSidebar session={session} />
      <div className="admin-main">{props.children}</div>
    </div>
  );
}