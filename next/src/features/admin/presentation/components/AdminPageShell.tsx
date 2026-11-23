import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getVerifiedAdminSession } from "../admin-auth";
import { ADMIN_LOGIN_PATH } from "../routes";
import { AdminNav } from "./AdminNav";

/** 관리자 전용 페이지 래퍼(미들웨어 보조·네비). */
export async function AdminPageShell(props: { children: ReactNode }) {
  const session = await getVerifiedAdminSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return (
    <>
      <AdminNav loginId={session.loginId} role={session.role} />
      {props.children}
    </>
  );
}