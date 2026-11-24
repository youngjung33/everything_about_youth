import type { AdminAccount } from "@/features/admin/domain/admin-account";
import type { AdminRole } from "@/features/admin/domain/role";
import { hashAdminPassword } from "@/features/admin/domain/password";
import type { AdminAccountRepository } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";

/** 테스트용 관리자 계정 한 줄 insert */
export async function insertTestAdmin(
  accounts: AdminAccountRepository,
  loginId: string,
  role: AdminRole,
  password = "secret12",
  extra: Partial<AdminAccount> = {},
): Promise<void> {
  await accounts.insert(
    {
      loginId,
      role,
      disabled: false,
      isRoot: false,
      permissionsOverride: null,
      createdAt: "t",
      updatedAt: "t",
      createdBy: null,
      ...extra,
    },
    hashAdminPassword(password),
  );
}