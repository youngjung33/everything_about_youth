import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { guardDashboard, requireAdminSession } from "@/features/admin/presentation/admin-page-access";
import { ADMIN_ROLE_LABELS } from "@/features/admin/domain/role";
import { buildAdminSidebarSections } from "@/features/admin/presentation/admin-sidebar-nav";

export const dynamic = "force-dynamic";

/** 관리자 홈(대시보드) */
export default async function AdminHomePage() {
  const session = await requireAdminSession();
  guardDashboard(session);
  const menuCount = buildAdminSidebarSections(session.permissions).reduce((n, s) => n + s.items.length, 0);
  return (
    <AdminPageShell session={session}>
      <div className="admin-page">
        <header className="admin-page__header">
          <h1>대시보드</h1>
          <p className="hint">왼쪽 메뉴에서 수집·계정 작업을 진행하세요. 표시되는 메뉴는 권한에 따라 달라집니다.</p>
        </header>
        <div className="admin-cards">
          <div className="admin-stat card">
            <p className="admin-stat__label">로그인 계정</p>
            <p className="admin-stat__value">{session.loginId}</p>
          </div>
          <div className="admin-stat card">
            <p className="admin-stat__label">등급</p>
            <p className="admin-stat__value">
              {session.isRoot ? "루트 · 최고 관리자" : ADMIN_ROLE_LABELS[session.role]}
            </p>
          </div>
          <div className="admin-stat card">
            <p className="admin-stat__label">사용 가능 메뉴</p>
            <p className="admin-stat__value">{menuCount}개</p>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}