/** 관리자 권한 등급(숫자가 클수록 상위). */
export const ADMIN_ROLES = ["viewer", "operator", "admin", "super"] as const;

/** 관리자 권한 등급 */
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** 화면 표시용 */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  viewer: "조회 전용",
  operator: "수집 실행",
  admin: "관리자",
  super: "최고 관리자",
};

/** 역할별 허용 작업. */
export const ADMIN_ACTIONS = [
  "sync_view",
  "sync_trigger",
  "password_change_self",
  "account_list",
  "account_create",
  "account_update",
  "password_reset_other",
] as const;

/** 관리자가 할 수 있는 작업 */
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  super: 4,
};

/** 등급 비교 */
export function roleRank(role: AdminRole): number {
  return ROLE_RANK[role];
}

const ROLE_ACTIONS: Record<AdminRole, ReadonlySet<AdminAction>> = {
  viewer: new Set(["sync_view", "password_change_self"]),
  operator: new Set(["sync_view", "sync_trigger", "password_change_self"]),
  admin: new Set([
    "sync_view",
    "sync_trigger",
    "password_change_self",
    "account_list",
    "account_create",
    "account_update",
  ]),
  super: new Set(ADMIN_ACTIONS),
};

/** 이 등급이 작업을 할 수 있는지 */
export function canAdmin(role: AdminRole, action: AdminAction): boolean {
  return ROLE_ACTIONS[role].has(action);
}

/** actor 가 대상 등급 계정을 만들거나 바꿀 수 있는지 (자기보다 낮은 등급만). */
export function canManageRole(actor: AdminRole, target: AdminRole): boolean {
  if (!canAdmin(actor, "account_create") && !canAdmin(actor, "account_update")) return false;
  if (actor === "super") return true;
  return roleRank(target) < roleRank(actor);
}

/** 문자열이 등록된 등급인지 */
export function parseAdminRole(value: string): AdminRole | null {
  return (ADMIN_ROLES as readonly string[]).includes(value) ? (value as AdminRole) : null;
}