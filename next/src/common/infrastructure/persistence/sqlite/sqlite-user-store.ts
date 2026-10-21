import { and, eq, lte } from "drizzle-orm";
import type { SsoProviderId, SsoTicketStore, UserStore } from "@/common/application/sso";
import type { SqliteDb } from "./client";
import { ssoTickets, userIdentities, users } from "./schema";

export class SqliteUserStore implements UserStore {
  constructor(private readonly db: SqliteDb) {}

  async findOrCreate(provider: SsoProviderId, subject: string, at: string, newId: () => string): Promise<string> {
    return this.db.transaction((tx) => {
      const found = tx
        .select({ userId: userIdentities.userId })
        .from(userIdentities)
        .where(and(eq(userIdentities.provider, provider), eq(userIdentities.subject, subject)))
        .get();

      if (found) {
        tx.update(users).set({ lastLoginAt: at }).where(eq(users.id, found.userId)).run();
        return found.userId;
      }

      const userId = newId();
      tx.insert(users).values({ id: userId, createdAt: at, lastLoginAt: at }).run();
      tx.insert(userIdentities).values({ provider, subject, userId, createdAt: at }).run();
      return userId;
    });
  }

  async delete(userId: string): Promise<void> {
    // 로그인 정보와 남은 티켓은 외래 키(cascade)로 함께 지워지고, 세션 기록은 user_id 만 비워진다.
    this.db.delete(users).where(eq(users.id, userId)).run();
  }
}

export class SqliteSsoTicketStore implements SsoTicketStore {
  constructor(private readonly db: SqliteDb) {}

  async create(ticketHash: string, userId: string, challenge: string, expiresAt: string, now: string): Promise<void> {
    // 쓰이지 않고 만료된 티켓이 쌓이지 않게 만들 때마다 치운다.
    this.db.delete(ssoTickets).where(lte(ssoTickets.expiresAt, now)).run();
    this.db.insert(ssoTickets).values({ ticketHash, userId, challenge, expiresAt }).run();
  }

  async consume(ticketHash: string, now: string): Promise<{ userId: string; challenge: string } | null> {
    // 지우면서 읽는다. 같은 티켓으로 두 번 교환할 수 없다.
    const row = this.db.delete(ssoTickets).where(eq(ssoTickets.ticketHash, ticketHash)).returning().get();
    if (!row || row.expiresAt <= now) return null;
    return { userId: row.userId, challenge: row.challenge };
  }
}
