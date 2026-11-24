import type { ReactNode } from "react";
import type { AdminSessionView } from "../../application/use-cases/verify-admin-session";
import { requireAdminSession } from "../admin-page-access";
import { AdminNav } from "./AdminNav";

/** 관리자 전용 페이지 래퍼(미들웨어 보조·네비). */
export async function AdminPageShell(props: { children: ReactNode; session?: AdminSessionView }) {
  const session = props.session ?? (await requireAdminSession());
  return (
    <>
      <AdminNav session={session} />
      {props.children}
    </>
  );
}