"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_API_ACCOUNTS } from "../routes";
import { ADMIN_ROLE_LABELS, ADMIN_ROLES as ROLES, canAdmin, type AdminRole } from "../../domain/role";

type Row = { loginId: string; role: AdminRole; roleLabel: string; disabled: boolean; createdAt: string; createdBy: string | null };

export function AdminAccountsPanel(props: { actorRole: AdminRole }) {
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("operator");

  const load = useCallback(async () => {
    const res = await fetch(ADMIN_API_ACCOUNTS, { credentials: "include" });
    const data = (await res.json()) as { items?: Row[]; error?: { message?: string } };
    if (!res.ok) {
      setError(data.error?.message ?? "목록을 불러오지 못했습니다.");
      return;
    }
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignableRoles = ROLES.filter((r) => canAdmin(props.actorRole, "account_create") && (props.actorRole === "super" || r !== "super"));

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(ADMIN_API_ACCOUNTS, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password, role }),
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setError(data.error?.message ?? "계정을 만들지 못했습니다.");
      return;
    }
    setLoginId("");
    setPassword("");
    await load();
  }

  async function patchAccount(targetId: string, patch: Record<string, unknown>) {
    const res = await fetch(`${ADMIN_API_ACCOUNTS}/${encodeURIComponent(targetId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) setError(data.error?.message ?? "저장하지 못했습니다.");
    else await load();
  }

  const canCreate = canAdmin(props.actorRole, "account_create");
  const canUpdate = canAdmin(props.actorRole, "account_update");

  return (
    <div className="detail">
      <h1>관리자 계정</h1>
      {canCreate && (
        <form className="filters" onSubmit={createAccount} style={{ marginBottom: 24 }}>
          <h2>새 계정</h2>
          <label className="field">
            <span>아이디</span>
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} required minLength={2} />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <label className="field">
            <span>등급</span>
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {ADMIN_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn primary">
            만들기
          </button>
        </form>
      )}
      {error && <p className="hint" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>등급</th>
              <th>상태</th>
              <th>생성</th>
              {canUpdate && <th>작업</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.loginId}>
                <td>{row.loginId}</td>
                <td>{row.roleLabel}</td>
                <td>{row.disabled ? "비활성" : "사용 중"}</td>
                <td>
                  <small>{row.createdBy ? `${row.createdBy} · ` : ""}{row.createdAt.slice(0, 10)}</small>
                </td>
                {canUpdate && (
                  <td>
                    {!row.disabled ? (
                      <button type="button" className="btn" onClick={() => patchAccount(row.loginId, { disabled: true })}>
                        비활성화
                      </button>
                    ) : (
                      <button type="button" className="btn" onClick={() => patchAccount(row.loginId, { disabled: false })}>
                        활성화
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}