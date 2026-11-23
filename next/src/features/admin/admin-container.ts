import { loadAuthConfig } from "@/common/infrastructure/config/auth-config";
import { getCommonContainer } from "@/common/infrastructure/container";
import { sqliteOf } from "@/common/infrastructure/container";
import { ChangeAdminPassword } from "./application/use-cases/change-admin-password";
import { CreateAdminAccount, ListAdminAccounts, UpdateAdminAccount } from "./application/use-cases/manage-admin-accounts";
import { ensureBootstrapAdmin } from "./application/use-cases/ensure-bootstrap-admin";
import { LoginAdmin } from "./application/use-cases/login-admin";
import { LogoutAdmin } from "./application/use-cases/logout-admin";
import { VerifyAdminSession } from "./application/use-cases/verify-admin-session";
import { createAdminRepositories } from "./infrastructure/persistence/sqlite/admin-repositories";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const key = Symbol.for("everything_about_youth.admin-container");

export interface AdminContainer {
  ensureBootstrap(): Promise<void>;
  login: LoginAdmin;
  logout: LogoutAdmin;
  verifySession: VerifyAdminSession;
  changePassword: ChangeAdminPassword;
  listAccounts: ListAdminAccounts;
  createAccount: CreateAdminAccount;
  updateAccount: UpdateAdminAccount;
}

function build(): AdminContainer {
  const common = getCommonContainer();
  const db = sqliteOf(common);
  const { accounts, sessions } = createAdminRepositories(db.db, common.clock);

  return {
    async ensureBootstrap() {
      await ensureBootstrapAdmin(accounts, common.clock.now().toISOString());
    },
    login: new LoginAdmin(accounts, sessions, () => crypto.randomUUID(), SESSION_TTL_MS),
    logout: new LogoutAdmin(sessions),
    verifySession: new VerifyAdminSession(accounts, sessions),
    changePassword: new ChangeAdminPassword(accounts),
    listAccounts: new ListAdminAccounts(accounts),
    createAccount: new CreateAdminAccount(accounts),
    updateAccount: new UpdateAdminAccount(accounts),
  };
}

/** 관리자 유스케이스 모음. */
export function getAdminContainer(): AdminContainer {
  const g = globalThis as typeof globalThis & { [key]?: AdminContainer };
  if (!g[key]) g[key] = build();
  return g[key]!;
}

/** JWT 쿠키 서명용 시크릿·issuer */
export function adminJwtConfig() {
  const auth = loadAuthConfig();
  return {
    secret: new TextEncoder().encode(auth.secret),
    issuer: auth.issuer,
    audience: `${auth.audience}-admin`,
  };
}