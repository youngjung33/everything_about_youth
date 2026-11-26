"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ADMIN_API_ACCOUNTS } from "../routes";
import { ADMIN_ROLE_LABELS, ADMIN_ROLES as ROLES, canManageRole, type AdminRole } from "../../domain/role";
import type { AdminPermissions, AdminPermissionsOverride } from "../../domain/permissions";
import { AdminPermissionsEditor } from "./AdminPermissionsEditor";
import { AdminPermissionNotice } from "./AdminPermissionNotice";
import { AdminSortHeader } from "./AdminSortHeader";
import {
  DEFAULT_ADMIN_ACCOUNT_LIST_SORT,
  type AdminAccountListSort,
  type AdminAccountSortField,
} from "../admin-account-list-sort";

type Row = {
  loginId: string;
  role: AdminRole;
  roleLabel: string;
  disabled: boolean;
  isRoot: boolean;
  hasCustomPermissions?: boolean;
  permissionsOverride?: AdminPermissionsOverride | null;
  effectivePermissions?: AdminPermissions;
  createdAt: string;
  createdBy: string | null;
};

export function AdminAccountsPanel(props: {
  actorRole: AdminRole;
  actorPermissions: AdminPermissions;
  devDiagnostics?: boolean;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("operator");
  const [createOverride, setCreateOverride] = useState<AdminPermissionsOverride | null>(null);
  const [customizeCreate, setCustomizeCreate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("operator");
  const [editOverride, setEditOverride] = useState<AdminPermissionsOverride | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [listSort, setListSort] = useState<AdminAccountListSort>(DEFAULT_ADMIN_ACCOUNT_LIST_SORT);

  const fields = props.actorPermissions.accounts.fields;
  const canCreate = props.actorPermissions.accounts.page === "edit" && props.actorPermissions.accounts.create;
  const canUpdate = props.actorPermissions.accounts.page === "edit";

  const load = useCallback(async () => {
    const params = new URLSearchParams({ sort: listSort.field, order: listSort.order });
    if (props.devDiagnostics) params.set("verbose", "1");
    const res = await fetch(`${ADMIN_API_ACCOUNTS}?${params}`, { credentials: "include" });
    const data = (await res.json()) as {
      items?: Row[];
      meta?: { readOnly?: boolean };
      error?: { code?: string; message?: string };
    };
    if (res.status === 401 || res.status === 403) {
      setAccessDenied(true);
      setError(data.error?.message ?? "권한이 없습니다.");
      setItems([]);
      return;
    }
    if (!res.ok) {
      setError(data.error?.message ?? "목록을 불러오지 못했습니다.");
      return;
    }
    setAccessDenied(false);
    setReadOnly(Boolean(data.meta?.readOnly));
    setItems(data.items ?? []);
  }, [listSort, props.devDiagnostics]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycleListSort = (field: AdminAccountSortField) => {
    setListSort((prev) =>
      prev.field === field ? { field, order: prev.order === "asc" ? "desc" : "asc" } : { field, order: "asc" },
    );
  };

  const assignableRoles = ROLES.filter((r) => canManageRole(props.actorRole, r));

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(ADMIN_API_ACCOUNTS, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId,
        password,
        role,
        permissionsOverride: customizeCreate ? createOverride : null,
      }),
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setError(data.error?.message ?? "계정을 만들지 못했습니다.");
      return;
    }
    setLoginId("");
    setPassword("");
    setCreateOverride(null);
    setCustomizeCreate(false);
    await load();
  }

  async function patchAccount(targetId: string, patch: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`${ADMIN_API_ACCOUNTS}/${encodeURIComponent(targetId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) setError(data.error?.message ?? "저장하지 못했습니다.");
    else {
      setEditing(null);
      await load();
    }
  }

  function startEdit(row: Row) {
    setEditing(row.loginId);
    setEditRole(row.role);
    setEditOverride(row.permissionsOverride ?? null);
    setEditPassword("");
  }

  return (
    <div className="detail">
      <h1>관리자 계정</h1>
      {props.devDiagnostics && (
        <AdminPermissionNotice
          variant="dev"
          title="개발자 진단 모드"
          message="API 에서 타 계정의 권한 템플릿 전체를 불러옵니다. 운영(APP_ENV=prod)에서는 노출되지 않습니다."
        />
      )}
      {accessDenied && (
        <AdminPermissionNotice
          variant="denied"
          title="계정 목록 권한 없음"
          message="계정 관리 페이지에 들어올 수 있어도 목록 API 권한이 없으면 데이터를 표시하지 않습니다."
        />
      )}
      {readOnly && !accessDenied && (
        <AdminPermissionNotice title="읽기 전용" message="등급·비활성·권한 변경은 편집 권한이 있는 관리자만 할 수 있습니다." />
      )}
      {canCreate && fields.loginId === "edit" && (
        <form className="filters" onSubmit={createAccount} style={{ marginBottom: 24 }}>
          <h2>새 계정</h2>
          <label className="field">
            <span>아이디</span>
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} required minLength={2} />
          </label>
          {fields.password === "edit" && (
            <label className="field">
              <span>비밀번호</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </label>
          )}
          {fields.role === "edit" && (
            <label className="field">
              <span>등급(템플릿)</span>
              <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ADMIN_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {fields.permissions === "edit" && (
            <label className="field">
              <input type="checkbox" checked={customizeCreate} onChange={(e) => setCustomizeCreate(e.target.checked)} />
              등급 기본과 다른 권한 세부 설정
            </label>
          )}
          {customizeCreate && fields.permissions === "edit" && (
            <AdminPermissionsEditor
              role={role}
              actorPermissions={props.actorPermissions}
              override={createOverride}
              onChange={setCreateOverride}
            />
          )}
          <button type="submit" className="btn primary">
            만들기
          </button>
        </form>
      )}
      {error && (
        <p className="hint" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <AdminSortHeader
                column="loginId"
                label="아이디"
                sortKey={listSort.field}
                sortOrder={listSort.order}
                onSort={cycleListSort}
              />
              <AdminSortHeader
                column="role"
                label="등급"
                sortKey={listSort.field}
                sortOrder={listSort.order}
                onSort={cycleListSort}
              />
              <th scope="col">권한</th>
              <AdminSortHeader
                column="disabled"
                label="상태"
                sortKey={listSort.field}
                sortOrder={listSort.order}
                onSort={cycleListSort}
              />
              <AdminSortHeader
                column="createdAt"
                label="생성"
                sortKey={listSort.field}
                sortOrder={listSort.order}
                onSort={cycleListSort}
              />
              {canUpdate && <th scope="col">작업</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <Fragment key={row.loginId}>
                <tr>
                  <td>
                    {row.loginId}
                    {row.isRoot ? " (루트)" : ""}
                  </td>
                  <td>{row.roleLabel}</td>
                  <td>
                    {row.effectivePermissions
                      ? "세부 설정 열람 가능"
                      : row.hasCustomPermissions
                        ? "맞춤 설정 있음"
                        : "등급 기본"}
                  </td>
                  <td>{row.disabled ? "비활성" : "사용 중"}</td>
                  <td>
                    <small>
                      {row.createdBy ? `${row.createdBy} · ` : ""}
                      {row.createdAt.slice(0, 10)}
                    </small>
                  </td>
                  {canUpdate && (
                    <td>
                      {!row.isRoot && (
                        <>
                          <button type="button" className="btn" onClick={() => startEdit(row)}>
                            편집
                          </button>
                          {fields.disabled === "edit" &&
                            (!row.disabled ? (
                              <button type="button" className="btn" onClick={() => patchAccount(row.loginId, { disabled: true })}>
                                비활성화
                              </button>
                            ) : (
                              <button type="button" className="btn" onClick={() => patchAccount(row.loginId, { disabled: false })}>
                                활성화
                              </button>
                            ))}
                        </>
                      )}
                      {row.isRoot && <span className="hint">루트 — 변경 불가</span>}
                    </td>
                  )}
                </tr>
                {editing === row.loginId && !row.isRoot && (
                  <tr key={`${row.loginId}-edit`}>
                    <td colSpan={canUpdate ? 6 : 5}>
                      {fields.role === "edit" && (
                        <label className="field">
                          <span>등급</span>
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value as AdminRole)}>
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {ADMIN_ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {fields.permissions === "edit" && (
                        <AdminPermissionsEditor
                          role={editRole}
                          actorPermissions={props.actorPermissions}
                          override={editOverride}
                          onChange={setEditOverride}
                        />
                      )}
                      {fields.resetPassword === "edit" && (
                        <label className="field">
                          <span>새 비밀번호(비우면 유지)</span>
                          <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} minLength={6} />
                        </label>
                      )}
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          const patch: Record<string, unknown> = {};
                          if (fields.role === "edit" && editRole !== row.role) patch.role = editRole;
                          if (fields.permissions === "edit") patch.permissionsOverride = editOverride;
                          if (editPassword) patch.newPassword = editPassword;
                          void patchAccount(row.loginId, patch);
                        }}
                      >
                        저장
                      </button>
                      <button type="button" className="btn" onClick={() => setEditing(null)}>
                        취소
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}