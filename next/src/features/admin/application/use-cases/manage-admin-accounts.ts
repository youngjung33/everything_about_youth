import type { AdminAccount } from "../../domain/admin-account";
import { hashAdminPassword, WeakPasswordError } from "../../domain/password";
import {
  type AdminPermissions,
  type AdminPermissionsOverride,
  isPermissionsSubset,
  resolveAdminPermissions,
} from "../../domain/permissions";
import { canManageRole, type AdminRole } from "../../domain/role";
import { AdminAccountError } from "../admin-errors";
import type { AdminAccountRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";
import type { AdminAccountListSort } from "../../domain/admin-account-list-sort";
import { DEFAULT_ADMIN_ACCOUNT_LIST_SORT } from "../../domain/admin-account-list-sort";

function assertRoleTemplateAllowed(actor: AdminPermissions, role: AdminRole, override: AdminPermissionsOverride | null): void {
  const effective = resolveAdminPermissions(role, override, false);
  if (!isPermissionsSubset(effective, actor)) throw new AdminAccountError("permission_exceeds");
}

/** 계정 목록(로그인·등급만). */
export class ListAdminAccounts {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(sort: AdminAccountListSort = DEFAULT_ADMIN_ACCOUNT_LIST_SORT): Promise<AdminAccount[]> {
    return this.accounts.list(sort);
  }
}

/** 하위 등급 관리자 계정 생성. */
export class CreateAdminAccount {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(
    actor: { loginId: string; role: AdminRole; permissions: AdminPermissions },
    input: {
      loginId: string;
      password: string;
      role: AdminRole;
      createdBy: string;
      permissionsOverride?: AdminPermissionsOverride | null;
    },
    now: string,
  ): Promise<void> {
    const loginId = input.loginId.trim();
    if (!loginId || loginId.length < 2) throw new AdminAccountError("forbidden");
    if (!canManageRole(actor.role, input.role)) throw new AdminAccountError("forbidden");
    if (await this.accounts.findByLoginId(loginId)) throw new AdminAccountError("exists");

    const override = input.permissionsOverride ?? null;
    assertRoleTemplateAllowed(actor.permissions, input.role, override);

    try {
      const passwordHash = hashAdminPassword(input.password);
      const account: AdminAccount = {
        loginId,
        role: input.role,
        disabled: false,
        isRoot: false,
        permissionsOverride: override,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
      };
      await this.accounts.insert(account, passwordHash);
    } catch (e) {
      if (e instanceof WeakPasswordError) throw new AdminAccountError("weak_password");
      throw e;
    }
  }
}

/** 등급·권한·비활성·다른 사람 비밀번호 재설정. */
export class UpdateAdminAccount {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(
    actor: { loginId: string; role: AdminRole; permissions: AdminPermissions },
    targetLoginId: string,
    patch: {
      role?: AdminRole;
      disabled?: boolean;
      newPassword?: string;
      permissionsOverride?: AdminPermissionsOverride | null;
      clearPermissionsOverride?: boolean;
    },
    now: string,
  ): Promise<void> {
    const target = await this.accounts.findByLoginId(targetLoginId);
    if (!target) throw new AdminAccountError("not_found");

    if (target.isRoot) {
      if (
        patch.role !== undefined ||
        patch.disabled !== undefined ||
        patch.permissionsOverride !== undefined ||
        patch.clearPermissionsOverride
      ) {
        throw new AdminAccountError("root_protected");
      }
    }

    const targetRole = patch.role ?? target.role;
    const nextOverride =
      patch.clearPermissionsOverride === true
        ? null
        : patch.permissionsOverride !== undefined
          ? patch.permissionsOverride
          : target.permissionsOverride;

    if (patch.permissionsOverride !== undefined || patch.clearPermissionsOverride) {
      if (actor.permissions.accounts.fields.permissions !== "edit") throw new AdminAccountError("forbidden");
      assertRoleTemplateAllowed(actor.permissions, targetRole, nextOverride);
      const ok = await this.accounts.updatePermissions(targetLoginId, nextOverride, now);
      if (!ok) throw new AdminAccountError("not_found");
    }

    if (patch.role !== undefined) {
      if (!canManageRole(actor.role, patch.role) || !canManageRole(actor.role, target.role)) {
        throw new AdminAccountError("forbidden");
      }
      if (target.role === "super" && patch.role !== "super" && (await this.superCount()) <= 1) {
        throw new AdminAccountError("last_super");
      }
      assertRoleTemplateAllowed(actor.permissions, patch.role, nextOverride);
      const ok = await this.accounts.updateRole(targetLoginId, patch.role, now);
      if (!ok) throw new AdminAccountError("not_found");
    }

    if (patch.disabled !== undefined) {
      if (actor.permissions.accounts.fields.disabled !== "edit") throw new AdminAccountError("forbidden");
      if (!canManageRole(actor.role, target.role)) throw new AdminAccountError("forbidden");
      if (targetLoginId === actor.loginId && patch.disabled) throw new AdminAccountError("forbidden");
      if (target.role === "super" && patch.disabled && (await this.superCount()) <= 1) {
        throw new AdminAccountError("last_super");
      }
      const ok = await this.accounts.setDisabled(targetLoginId, patch.disabled, now);
      if (!ok) throw new AdminAccountError("not_found");
    }

    if (patch.newPassword !== undefined) {
      if (targetLoginId === actor.loginId) throw new AdminAccountError("forbidden");
      if (actor.permissions.accounts.fields.resetPassword !== "edit") throw new AdminAccountError("forbidden");
      try {
        const hash = hashAdminPassword(patch.newPassword);
        const ok = await this.accounts.updatePassword(targetLoginId, hash, now);
        if (!ok) throw new AdminAccountError("not_found");
      } catch (e) {
        if (e instanceof WeakPasswordError) throw new AdminAccountError("weak_password");
        throw e;
      }
    }
  }

  private async superCount(): Promise<number> {
    const all = await this.accounts.list();
    return all.filter((a) => a.role === "super" && !a.disabled).length;
  }
}