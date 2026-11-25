import { AdminLoginForm } from "@/features/admin/presentation/components/AdminLoginForm";

export const dynamic = "force-dynamic";

/** 관리자 로그인(미들웨어 제외). */
export default async function AdminLoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = (await props.searchParams).next;
  const nextPath = typeof next === "string" ? next : "/admin";
  return (
    <div className="admin-login-wrap">
      <h1>관리자 로그인</h1>
      <p className="hint">데이터 수집·계정 관리는 관리자만 접근할 수 있습니다.</p>
      <AdminLoginForm nextPath={nextPath} />
    </div>
  );
}