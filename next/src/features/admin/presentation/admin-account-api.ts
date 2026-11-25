import type { AdminAccount } from "../domain/admin-account";
import { ADMIN_ROLE_LABELS } from "../domain/role";
import type { AdminPermissions, AdminPermissionsOverride } from "../domain/permissions";
import { resolveAdminPermissions } from "../domain/permissions";
import type { AdminSessionView } from "../application/use-cases/verify-admin-session";
import { adminDevDiagnosticsEnabled } from "./admin-dev-diagnostics";

/** GET /admin/accounts 항목 (클라이언트 노출). */
export interface AdminAccountApiItem {
  loginId: string;
  role: AdminAccount["role"];
  roleLabel: string;
  disabled: boolean;
  isRoot: boolean;
  createdAt: string;
  createdBy: string | null;
  hasCustomPermissions?: boolean;
  permissionsOverride?: AdminPermissionsOverride | null;
  effectivePermissions?: AdminPermissions;
}

/** 요청자 권한보다 많은 내부 정보는 빼서 반환한다. */
export function toAdminAccountApiItem(
  actor: AdminSessionView,
  account: AdminAccount,
  options: { verbose: boolean },
): AdminAccountApiItem {
  const verbose = options.verbose && adminDevDiagnosticsEnabled(actor);
  const permField = actor.permissions.accounts.fields.permissions;
  const base: AdminAccountApiItem = {
    loginId: account.loginId,
    role: account.role,
    roleLabel: ADMIN_ROLE_LABELS[account.role],
    disabled: account.disabled,
    isRoot: account.isRoot,
    createdAt: account.createdAt,
    createdBy: account.createdBy,
  };
  if (account.permissionsOverride && Object.keys(account.permissionsOverride).length > 0) {
    base.hasCustomPermissions = true;
  }
  if (permField === "none" && !verbose) return base;
  if (permField === "view") {
    return base;
  }
  if (permField === "edit" || verbose) {
    return {
      ...base,
      permissionsOverride: account.permissionsOverride,
      effectivePermissions: resolveAdminPermissions(account.role, account.permissionsOverride, account.isRoot),
    };
  }
  return base;
}