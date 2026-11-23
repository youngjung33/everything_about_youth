import type { AdminAccount } from "../../domain/admin-account";
import { hashAdminPassword } from "../../domain/password";
import type { AdminAccountRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

export const BOOTSTRAP_LOGIN_ID = "ADMIN";

/** 최초 기동 시 계정이 없으면 ADMIN / 123456 최고 관리자를 만든다. */
export async function ensureBootstrapAdmin(accounts: AdminAccountRepository, now: string): Promise<void> {
  if (accounts.count() > 0) return;
  const account: AdminAccount = {
    loginId: BOOTSTRAP_LOGIN_ID,
    role: "super",
    disabled: false,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
  };
  await accounts.insert(account, hashAdminPassword("123456"));
}