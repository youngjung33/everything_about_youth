import type { AdminAccount } from "../../domain/admin-account";
import { hashAdminPassword, WeakPasswordError } from "../../domain/password";
import { canManageRole, type AdminRole } from "../../domain/role";
import { AdminAccountError } from "../admin-errors";
import type { AdminAccountRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

/** 계정 목록(로그인·등급만). */
export class ListAdminAccounts {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(): Promise<AdminAccount[]> {
    return this.accounts.list();
  }
}

/** 하위 등급 관리자 계정 생성. */
export class CreateAdminAccount {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(
    actorRole: AdminRole,
    input: { loginId: string; password: string; role: AdminRole; createdBy: string },
    now: string,
  ): Promise<void> {
    const loginId = input.loginId.trim();
    if (!loginId || loginId.length < 2) throw new AdminAccountError("forbidden");
    if (!canManageRole(actorRole, input.role)) throw new AdminAccountError("forbidden");
    if (await this.accounts.findByLoginId(loginId)) throw new AdminAccountError("exists");
    try {
      const passwordHash = hashAdminPassword(input.password);
      const account: AdminAccount = {
        loginId,
        role: input.role,
        disabled: false,
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

/** 등급 변경·비활성·다른 사람 비밀번호 재설정. */
export class UpdateAdminAccount {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(
    actor: { loginId: string; role: AdminRole },
    targetLoginId: string,
    patch: { role?: AdminRole; disabled?: boolean; newPassword?: string },
    now: string,
  ): Promise<void> {
    const target = await this.accounts.findByLoginId(targetLoginId);
    if (!target) throw new AdminAccountError("not_found");

    if (patch.role !== undefined) {
      if (!canManageRole(actor.role, patch.role) || !canManageRole(actor.role, target.role)) {
        throw new AdminAccountError("forbidden");
      }
      if (target.role === "super" && patch.role !== "super" && (await this.superCount()) <= 1) {
        throw new AdminAccountError("last_super");
      }
      const ok = await this.accounts.updateRole(targetLoginId, patch.role, now);
      if (!ok) throw new AdminAccountError("not_found");
    }

    if (patch.disabled !== undefined) {
      if (!canManageRole(actor.role, target.role)) throw new AdminAccountError("forbidden");
      if (targetLoginId === actor.loginId && patch.disabled) throw new AdminAccountError("forbidden");
      if (target.role === "super" && patch.disabled && (await this.superCount()) <= 1) {
        throw new AdminAccountError("last_super");
      }
      const ok = await this.accounts.setDisabled(targetLoginId, patch.disabled, now);
      if (!ok) throw new AdminAccountError("not_found");
    }

    if (patch.newPassword !== undefined) {
      const canReset =
        actor.role === "super" || (canManageRole(actor.role, target.role) && targetLoginId !== actor.loginId);
      if (!canReset) throw new AdminAccountError("forbidden");
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