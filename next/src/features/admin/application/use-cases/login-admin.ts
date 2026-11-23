import { verifyAdminPassword } from "../../domain/password";
import type { AdminRole } from "../../domain/role";
import { AdminAuthError } from "../admin-errors";
import type { AdminAccountRepository, AdminSessionRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

export interface AdminLoginResult {
  sessionId: string; // sid
  loginId: string; // loginId
  role: AdminRole; // role
  expiresAt: string; // ISO
}

/** ID·비밀번호로 관리자 세션을 연다. */
export class LoginAdmin {
  constructor(
    private readonly accounts: AdminAccountRepository,
    private readonly sessions: AdminSessionRepository,
    private readonly newSessionId: () => string,
    private readonly sessionTtlMs: number,
  ) {}

  async execute(loginId: string, password: string, now: string, nowMs: number): Promise<AdminLoginResult> {
    const trimmed = loginId.trim();
    if (!trimmed || !password) throw new AdminAuthError("invalid");

    const account = await this.accounts.findByLoginId(trimmed);
    if (!account) throw new AdminAuthError("invalid");
    if (account.disabled) throw new AdminAuthError("disabled");

    const hash = await this.accounts.findPasswordHash(trimmed);
    if (!hash || !verifyAdminPassword(password, hash)) throw new AdminAuthError("invalid");

    const sessionId = this.newSessionId();
    const expiresAt = new Date(nowMs + this.sessionTtlMs).toISOString();
    await this.sessions.create(sessionId, trimmed, expiresAt, now);

    return { sessionId, loginId: trimmed, role: account.role, expiresAt };
  }
}