import { hashAdminPassword, verifyAdminPassword, WeakPasswordError } from "../../domain/password";
import { AdminAccountError, AdminAuthError } from "../admin-errors";
import type { AdminAccountRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

/** 본인 비밀번호 변경. */
export class ChangeAdminPassword {
  constructor(private readonly accounts: AdminAccountRepository) {}

  async execute(loginId: string, currentPassword: string, nextPassword: string, now: string): Promise<void> {
    const hash = await this.accounts.findPasswordHash(loginId);
    if (!hash || !verifyAdminPassword(currentPassword, hash)) throw new AdminAuthError("invalid");
    try {
      const next = hashAdminPassword(nextPassword);
      const ok = await this.accounts.updatePassword(loginId, next, now);
      if (!ok) throw new AdminAccountError("not_found");
    } catch (e) {
      if (e instanceof WeakPasswordError) throw new AdminAccountError("weak_password");
      throw e;
    }
  }
}