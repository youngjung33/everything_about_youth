import type { AdminAccount } from "../../domain/admin-account";
import { hashAdminPassword } from "../../domain/password";
import { loadAdminBootstrapConfig } from "../../infrastructure/config/admin-config";
import type { AdminAccountRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

/** 최초 기동 시 계정이 없으면 env 로 설정한 루트 최고 관리자를 만든다. */
export async function ensureBootstrapAdmin(accounts: AdminAccountRepository, now: string): Promise<void> {
  if (accounts.count() > 0) return;
  const boot = loadAdminBootstrapConfig();
  const account: AdminAccount = {
    loginId: boot.loginId,
    role: "super",
    disabled: false,
    isRoot: true,
    permissionsOverride: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
  };
  await accounts.insert(account, hashAdminPassword(boot.password));
}