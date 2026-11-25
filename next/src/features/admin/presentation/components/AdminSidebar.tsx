"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_ROLE_LABELS } from "../../domain/role";
import type { AdminSessionView } from "../../application/use-cases/verify-admin-session";
import { buildAdminSidebarSections, isAdminSidebarLinkActive } from "../admin-sidebar-nav";
import { AdminLogoutButton } from "./AdminLogoutButton";

/** 관리자 전용 왼쪽 사이드 네비게이션 */
export function AdminSidebar(props: { session: AdminSessionView }) {
  const pathname = usePathname() ?? "";
  const sections = buildAdminSidebarSections(props.session.permissions);
  const { loginId, role, isRoot } = props.session;

  return (
    <aside className="admin-sidebar" aria-label="관리자 메뉴">
      <div className="admin-sidebar__head">
        <p className="admin-sidebar__eyebrow">청년의 모든 것</p>
        <p className="admin-sidebar__title">관리 콘솔</p>
      </div>

      <nav className="admin-sidebar__nav">
        {sections.map((section) => (
          <div key={section.title} className="admin-sidebar__section">
            <p className="admin-sidebar__section-title">{section.title}</p>
            <ul className="admin-sidebar__list">
              {section.items.map((item) => {
                const active = isAdminSidebarLinkActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`admin-sidebar__link${active ? " admin-sidebar__link--active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="admin-sidebar__empty hint">접근 가능한 메뉴가 없습니다.</p>
        )}
      </nav>

      <div className="admin-sidebar__foot">
        <div className="admin-sidebar__user">
          <span className="admin-sidebar__user-id">{loginId}</span>
          <span className="admin-sidebar__user-role">
            {isRoot ? "루트" : ADMIN_ROLE_LABELS[role]}
          </span>
        </div>
        <AdminLogoutButton />
      </div>
    </aside>
  );
}