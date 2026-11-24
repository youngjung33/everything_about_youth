"use client";

import {
  ADMIN_SYNC_SECTIONS,
  type AccessLevel,
  type AdminPermissions,
  type AdminPermissionsOverride,
  type AdminSyncSection,
  permissionsForRole,
} from "../../domain/permissions";
import { ADMIN_ROLE_LABELS, type AdminRole } from "../../domain/role";

const SECTION_LABELS: Record<AdminSyncSection, string> = {
  housing: "임대주택",
  benefits: "청년 혜택",
  finance: "주거·자금",
  jobs: "일자리",
  living: "이사·생활",
};

const ACCESS_OPTIONS: AccessLevel[] = ["none", "view", "edit"];

function AccessSelect(props: {
  label: string;
  value: AccessLevel;
  max: AccessLevel;
  onChange: (v: AccessLevel) => void;
  disabled?: boolean;
}) {
  const allowed = ACCESS_OPTIONS.filter((o) => rank(o) <= rank(props.max));
  return (
    <label className="field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ minWidth: 120 }}>{props.label}</span>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value as AccessLevel)}
      >
        {allowed.map((o) => (
          <option key={o} value={o}>
            {o === "none" ? "없음" : o === "view" ? "보기" : "편집"}
          </option>
        ))}
      </select>
    </label>
  );
}

function rank(a: AccessLevel): number {
  return a === "none" ? 0 : a === "view" ? 1 : 2;
}

function mergeOverride(role: AdminRole, override: AdminPermissionsOverride | null): AdminPermissions {
  const base = permissionsForRole(role);
  if (!override) return base;
  const sync = { ...base.sync };
  if (override.sync) {
    for (const id of ADMIN_SYNC_SECTIONS) {
      const p = override.sync[id];
      if (p) sync[id] = { ...sync[id], ...p };
    }
  }
  return {
    dashboard: override.dashboard ?? base.dashboard,
    passwordSelf: override.passwordSelf ?? base.passwordSelf,
    accounts: {
      page: override.accounts?.page ?? base.accounts.page,
      create: override.accounts?.create ?? base.accounts.create,
      fields: { ...base.accounts.fields, ...override.accounts?.fields },
    },
    sync,
  };
}

function toOverride(role: AdminRole, effective: AdminPermissions): AdminPermissionsOverride | null {
  const base = permissionsForRole(role);
  const o: AdminPermissionsOverride = {};
  if (effective.dashboard !== base.dashboard) o.dashboard = effective.dashboard;
  if (effective.passwordSelf !== base.passwordSelf) o.passwordSelf = effective.passwordSelf;
  const accountsDiff: AdminPermissionsOverride["accounts"] = {};
  if (effective.accounts.page !== base.accounts.page) accountsDiff.page = effective.accounts.page;
  if (effective.accounts.create !== base.accounts.create) accountsDiff.create = effective.accounts.create;
  const fields: NonNullable<AdminPermissionsOverride["accounts"]>["fields"] = {};
  for (const key of Object.keys(base.accounts.fields) as (keyof typeof base.accounts.fields)[]) {
    if (effective.accounts.fields[key] !== base.accounts.fields[key]) fields[key] = effective.accounts.fields[key];
  }
  if (Object.keys(fields).length) accountsDiff.fields = fields;
  if (Object.keys(accountsDiff).length) o.accounts = accountsDiff;
  const sync: AdminPermissionsOverride["sync"] = {};
  for (const id of ADMIN_SYNC_SECTIONS) {
    const e = effective.sync[id];
    const b = base.sync[id];
    if (
      e.page !== b.page ||
      e.viewSources !== b.viewSources ||
      e.viewRuns !== b.viewRuns ||
      e.triggerSync !== b.triggerSync
    ) {
      sync[id] = { page: e.page, viewSources: e.viewSources, viewRuns: e.viewRuns, triggerSync: e.triggerSync };
    }
  }
  if (Object.keys(sync).length) o.sync = sync;
  return Object.keys(o).length ? o : null;
}

export function AdminPermissionsEditor(props: {
  role: AdminRole;
  actorPermissions: AdminPermissions;
  override: AdminPermissionsOverride | null;
  onChange: (override: AdminPermissionsOverride | null) => void;
  disabled?: boolean;
}) {
  const effective = mergeOverride(props.role, props.override);
  const actor = props.actorPermissions;

  function patch(next: AdminPermissions) {
    props.onChange(toOverride(props.role, next));
  }

  return (
    <div className="filters" style={{ marginTop: 12 }}>
      <h3>권한 세부 설정</h3>
      <p className="hint">역할({ADMIN_ROLE_LABELS[props.role]}) 기본값 대비 덮어쓰기. 본인 권한보다 높은 값은 선택할 수 없습니다.</p>
      <AccessSelect
        label="관리 홈"
        value={effective.dashboard}
        max={actor.dashboard}
        disabled={props.disabled}
        onChange={(dashboard) => patch({ ...effective, dashboard })}
      />
      <AccessSelect
        label="내 비밀번호"
        value={effective.passwordSelf}
        max={actor.passwordSelf}
        disabled={props.disabled}
        onChange={(passwordSelf) => patch({ ...effective, passwordSelf })}
      />
      <fieldset style={{ marginTop: 16, border: "1px solid var(--border)" }}>
        <legend>계정 관리</legend>
        <AccessSelect
          label="페이지"
          value={effective.accounts.page}
          max={actor.accounts.page}
          disabled={props.disabled}
          onChange={(page) => patch({ ...effective, accounts: { ...effective.accounts, page } })}
        />
        <label className="field">
          <input
            type="checkbox"
            checked={effective.accounts.create}
            disabled={props.disabled || !actor.accounts.create}
            onChange={(e) => patch({ ...effective, accounts: { ...effective.accounts, create: e.target.checked } })}
          />
          새 계정 만들기
        </label>
        {(
          [
            ["loginId", "아이디"],
            ["password", "비밀번호"],
            ["role", "등급"],
            ["disabled", "비활성"],
            ["permissions", "권한 템플릿"],
            ["resetPassword", "타인 PW 재설정"],
          ] as const
        ).map(([key, label]) => (
          <AccessSelect
            key={key}
            label={label}
            value={effective.accounts.fields[key]}
            max={actor.accounts.fields[key]}
            disabled={props.disabled}
            onChange={(v) =>
              patch({
                ...effective,
                accounts: {
                  ...effective.accounts,
                  fields: { ...effective.accounts.fields, [key]: v },
                },
              })
            }
          />
        ))}
      </fieldset>
      {ADMIN_SYNC_SECTIONS.map((section) => (
        <fieldset key={section} style={{ marginTop: 12, border: "1px solid var(--border)" }}>
          <legend>{SECTION_LABELS[section]} 수집</legend>
          <AccessSelect
            label="페이지"
            value={effective.sync[section].page}
            max={actor.sync[section].page}
            disabled={props.disabled}
            onChange={(page) =>
              patch({
                ...effective,
                sync: { ...effective.sync, [section]: { ...effective.sync[section], page } },
              })
            }
          />
          <label className="field">
            <input
              type="checkbox"
              checked={effective.sync[section].viewSources}
              disabled={props.disabled || !actor.sync[section].viewSources || effective.sync[section].page === "none"}
              onChange={(e) =>
                patch({
                  ...effective,
                  sync: { ...effective.sync, [section]: { ...effective.sync[section], viewSources: e.target.checked } },
                })
              }
            />
            소스 상태 표 보기
          </label>
          <label className="field">
            <input
              type="checkbox"
              checked={effective.sync[section].viewRuns}
              disabled={props.disabled || !actor.sync[section].viewRuns || effective.sync[section].page === "none"}
              onChange={(e) =>
                patch({
                  ...effective,
                  sync: { ...effective.sync, [section]: { ...effective.sync[section], viewRuns: e.target.checked } },
                })
              }
            />
            실행 이력 보기
          </label>
          <label className="field">
            <input
              type="checkbox"
              checked={effective.sync[section].triggerSync}
              disabled={props.disabled || !actor.sync[section].triggerSync || effective.sync[section].page !== "edit"}
              onChange={(e) =>
                patch({
                  ...effective,
                  sync: { ...effective.sync, [section]: { ...effective.sync[section], triggerSync: e.target.checked } },
                })
              }
            />
            수집 실행
          </label>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn"
        disabled={props.disabled}
        onClick={() => props.onChange(null)}
        style={{ marginTop: 8 }}
      >
        역할 기본값으로 되돌리기
      </button>
    </div>
  );
}