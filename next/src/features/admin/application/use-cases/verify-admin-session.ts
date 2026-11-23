import type { AdminRole } from "../../domain/role";
import { AdminSessionError } from "../admin-errors";
import type { AdminAccountRepository, AdminSessionRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

export interface AdminSessionView {
  sessionId: string; // sid
  loginId: string; // loginId
  role: AdminRole; // role
}

/** DB 에 살아 있는 관리자 세션인지 확인한다. */
export class VerifyAdminSession {
  constructor(
    private readonly accounts: AdminAccountRepository,
    private readonly sessions: AdminSessionRepository,
  ) {}

  async execute(sessionId: string, now: string): Promise<AdminSessionView> {
    if (!sessionId) throw new AdminSessionError("missing");
    const row = await this.sessions.findActive(sessionId, now);
    if (!row) throw new AdminSessionError("expired");
    const account = await this.accounts.findByLoginId(row.loginId);
    if (!account || account.disabled) throw new AdminSessionError("revoked");
    return { sessionId, loginId: account.loginId, role: account.role };
  }
}