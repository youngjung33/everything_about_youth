import type { AdminSessionRepository } from "../../infrastructure/persistence/sqlite/admin-repositories";

/** 관리자 세션을 폐기한다. */
export class LogoutAdmin {
  constructor(private readonly sessions: AdminSessionRepository) {}

  async execute(sessionId: string): Promise<void> {
    if (sessionId) await this.sessions.revoke(sessionId);
  }
}