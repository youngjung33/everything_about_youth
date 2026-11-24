import type { AdminRole } from "./role";

/** none=접근 불가, view=읽기, edit=읽기·변경 */
export type AccessLevel = "none" | "view" | "edit";

/** 수집 관리 섹션(앱 feature id 와 같음). */
export const ADMIN_SYNC_SECTIONS = ["housing", "benefits", "finance", "jobs", "living"] as const;

/** 수집 관리 섹션 */
export type AdminSyncSection = (typeof ADMIN_SYNC_SECTIONS)[number];

/** 한 섹션 수집 화면·API 권한 */
export interface SyncSectionPermissions {
  page: AccessLevel; // 페이지 진입
  viewSources: boolean; // 소스별 상태 표
  viewRuns: boolean; // 최근 실행 이력
  triggerSync: boolean; // 수집 버튼·API
}

/** 계정 관리 화면 필드별 */
export interface AccountsFieldPermissions {
  loginId: AccessLevel;
  password: AccessLevel;
  role: AccessLevel;
  disabled: AccessLevel;
  permissions: AccessLevel;
  resetPassword: AccessLevel;
}

/** 계정 관리 화면 */
export interface AccountsPermissions {
  page: AccessLevel;
  create: boolean;
  fields: AccountsFieldPermissions;
}

/** 관리자 전체 권한(저장·검사 단위) */
export interface AdminPermissions {
  dashboard: AccessLevel;
  passwordSelf: AccessLevel;
  accounts: AccountsPermissions;
  sync: Record<AdminSyncSection, SyncSectionPermissions>;
}

/** DB 에 저장하는 역할 대비 부분 덮어쓰기 */
export type AdminPermissionsOverride = {
  dashboard?: AccessLevel;
  passwordSelf?: AccessLevel;
  accounts?: Partial<AccountsPermissions> & { fields?: Partial<AccountsFieldPermissions> };
  sync?: Partial<Record<AdminSyncSection, Partial<SyncSectionPermissions>>>;
};

const FULL_SYNC = (): SyncSectionPermissions => ({
  page: "edit",
  viewSources: true,
  viewRuns: true,
  triggerSync: true,
});

const VIEW_SYNC = (): SyncSectionPermissions => ({
  page: "view",
  viewSources: true,
  viewRuns: true,
  triggerSync: false,
});

const NONE_SYNC = (): SyncSectionPermissions => ({
  page: "none",
  viewSources: false,
  viewRuns: false,
  triggerSync: false,
});

function allSync(map: () => SyncSectionPermissions): Record<AdminSyncSection, SyncSectionPermissions> {
  return Object.fromEntries(ADMIN_SYNC_SECTIONS.map((s) => [s, { ...map() }])) as Record<
    AdminSyncSection,
    SyncSectionPermissions
  >;
}

const ACCESS_RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 };

/** 역할별 기본 권한 템플릿 */
export function permissionsForRole(role: AdminRole): AdminPermissions {
  switch (role) {
    case "viewer":
      return {
        dashboard: "view",
        passwordSelf: "edit",
        accounts: {
          page: "none",
          create: false,
          fields: {
            loginId: "none",
            password: "none",
            role: "none",
            disabled: "none",
            permissions: "none",
            resetPassword: "none",
          },
        },
        sync: allSync(VIEW_SYNC),
      };
    case "operator":
      return {
        dashboard: "view",
        passwordSelf: "edit",
        accounts: {
          page: "none",
          create: false,
          fields: {
            loginId: "none",
            password: "none",
            role: "none",
            disabled: "none",
            permissions: "none",
            resetPassword: "none",
          },
        },
        sync: allSync(() => ({
          page: "edit",
          viewSources: true,
          viewRuns: true,
          triggerSync: true,
        })),
      };
    case "admin":
      return {
        dashboard: "view",
        passwordSelf: "edit",
        accounts: {
          page: "edit",
          create: true,
          fields: {
            loginId: "edit",
            password: "edit",
            role: "edit",
            disabled: "edit",
            permissions: "edit",
            resetPassword: "none",
          },
        },
        sync: allSync(() => ({
          page: "edit",
          viewSources: true,
          viewRuns: true,
          triggerSync: true,
        })),
      };
    case "super":
      return {
        dashboard: "edit",
        passwordSelf: "edit",
        accounts: {
          page: "edit",
          create: true,
          fields: {
            loginId: "edit",
            password: "edit",
            role: "edit",
            disabled: "edit",
            permissions: "edit",
            resetPassword: "edit",
          },
        },
        sync: allSync(FULL_SYNC),
      };
    default:
      return permissionsForRole("viewer");
  }
}

/** 루트(최초 bootstrap) 계정 — 항상 super 와 동일한 전체 권한 */
export function permissionsForRoot(): AdminPermissions {
  return permissionsForRole("super");
}

function mergeSyncSection(base: SyncSectionPermissions, patch?: Partial<SyncSectionPermissions>): SyncSectionPermissions {
  if (!patch) return base;
  return { ...base, ...patch };
}

function mergeAccessLevel(current: AccessLevel, next?: AccessLevel): AccessLevel {
  return next ?? current;
}

/** 역할 기본값 + 저장된 부분 덮어쓰기 */
export function resolveAdminPermissions(
  role: AdminRole,
  override: AdminPermissionsOverride | null,
  isRoot: boolean,
): AdminPermissions {
  if (isRoot) return permissionsForRoot();
  const base = permissionsForRole(role);
  if (!override) return base;
  const sync = { ...base.sync };
  if (override.sync) {
    for (const section of ADMIN_SYNC_SECTIONS) {
      const p = override.sync[section];
      if (p) sync[section] = mergeSyncSection(base.sync[section], p);
    }
  }
  const fields = { ...base.accounts.fields, ...override.accounts?.fields };
  const accounts: AccountsPermissions = {
    page: mergeAccessLevel(base.accounts.page, override.accounts?.page),
    create: override.accounts?.create ?? base.accounts.create,
    fields,
  };
  return {
    dashboard: mergeAccessLevel(base.dashboard, override.dashboard),
    passwordSelf: mergeAccessLevel(base.passwordSelf, override.passwordSelf),
    accounts,
    sync,
  };
}

/** JSON 파싱. 잘못된 형식이면 null */
export function parsePermissionsOverride(raw: string | null | undefined): AdminPermissionsOverride | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    return v as AdminPermissionsOverride;
  } catch {
    return null;
  }
}

export function serializePermissionsOverride(override: AdminPermissionsOverride | null): string | null {
  if (!override || Object.keys(override).length === 0) return null;
  return JSON.stringify(override);
}

/** 로그인 후 어떤 관리 기능이라도 열 수 있는지 */
export function hasAnyAdminAccess(perms: AdminPermissions): boolean {
  if (perms.dashboard !== "none" || perms.passwordSelf !== "none") return true;
  if (perms.accounts.page !== "none") return true;
  return ADMIN_SYNC_SECTIONS.some((s) => perms.sync[s].page !== "none");
}

export function canOpenDashboard(perms: AdminPermissions): boolean {
  return perms.dashboard !== "none";
}

export function canOpenAccountsPage(perms: AdminPermissions): boolean {
  return perms.accounts.page !== "none";
}

export function canOpenPasswordSelf(perms: AdminPermissions): boolean {
  return perms.passwordSelf !== "none";
}

export function canOpenSyncPage(perms: AdminPermissions, section: AdminSyncSection): boolean {
  return perms.sync[section].page !== "none";
}

export function canTriggerSync(perms: AdminPermissions, section: AdminSyncSection): boolean {
  const s = perms.sync[section];
  return s.page === "edit" && s.triggerSync;
}

export function maxAccess(a: AccessLevel, b: AccessLevel): AccessLevel {
  return ACCESS_RANK[a] >= ACCESS_RANK[b] ? a : b;
}

/** grant 가 actor 권한의 부분집합인지 (필드·페이지 단위) */
export function isPermissionsSubset(grant: AdminPermissions, actor: AdminPermissions): boolean {
  if (ACCESS_RANK[grant.dashboard] > ACCESS_RANK[actor.dashboard]) return false;
  if (ACCESS_RANK[grant.passwordSelf] > ACCESS_RANK[actor.passwordSelf]) return false;
  if (!isAccountsSubset(grant.accounts, actor.accounts)) return false;
  for (const section of ADMIN_SYNC_SECTIONS) {
    if (!isSyncSubset(grant.sync[section], actor.sync[section])) return false;
  }
  return true;
}

function isAccountsSubset(grant: AccountsPermissions, actor: AccountsPermissions): boolean {
  if (ACCESS_RANK[grant.page] > ACCESS_RANK[actor.page]) return false;
  if (grant.create && !actor.create) return false;
  if (ACCESS_RANK[grant.fields.loginId] > ACCESS_RANK[actor.fields.loginId]) return false;
  if (ACCESS_RANK[grant.fields.password] > ACCESS_RANK[actor.fields.password]) return false;
  if (ACCESS_RANK[grant.fields.role] > ACCESS_RANK[actor.fields.role]) return false;
  if (ACCESS_RANK[grant.fields.disabled] > ACCESS_RANK[actor.fields.disabled]) return false;
  if (ACCESS_RANK[grant.fields.permissions] > ACCESS_RANK[actor.fields.permissions]) return false;
  if (ACCESS_RANK[grant.fields.resetPassword] > ACCESS_RANK[actor.fields.resetPassword]) return false;
  return true;
}

function isSyncSubset(grant: SyncSectionPermissions, actor: SyncSectionPermissions): boolean {
  if (ACCESS_RANK[grant.page] > ACCESS_RANK[actor.page]) return false;
  if (grant.viewSources && !actor.viewSources) return false;
  if (grant.viewRuns && !actor.viewRuns) return false;
  if (grant.triggerSync && !actor.triggerSync) return false;
  return true;
}

/** override 만으로 유효 권한을 만든 뒤 actor 부분집합인지 */
export function isOverrideSubsetOfActor(
  role: AdminRole,
  override: AdminPermissionsOverride | null,
  actor: AdminPermissions,
  isTargetRoot: boolean,
): boolean {
  const effective = resolveAdminPermissions(role, override, isTargetRoot);
  return isPermissionsSubset(effective, actor);
}