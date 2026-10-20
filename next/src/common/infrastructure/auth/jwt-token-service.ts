import { errors, jwtVerify, SignJWT } from "jose";
import {
  InvalidTokenError,
  type IssuedToken,
  type TokenClaims,
  type TokenService,
  type TokenUse,
} from "@/common/application/auth";
import type { Clock } from "@/common/application/system";
import type { AuthConfig } from "../config/auth-config";

/** HS256 로 서명하는 JWT. 알고리즘을 고정해서 `alg: none` 이나 다른 알고리즘으로 바꿔치기한 토큰을 거절한다. */
const ALGORITHM = "HS256";

export class JoseTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(
    private readonly config: Omit<AuthConfig, "secret"> & { secret: string },
    private readonly clock: Clock,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {
    this.key = new TextEncoder().encode(config.secret);
  }

  async issue(use: TokenUse, sub: string): Promise<IssuedToken> {
    const expiresIn = use === "access" ? this.config.accessTtlSec : this.config.refreshTtlSec;
    const nowSec = Math.floor(this.clock.now().getTime() / 1000);
    const token = await new SignJWT({ use })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(sub)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setJti(this.newId())
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + expiresIn)
      .sign(this.key);
    return { token, expiresIn };
  }

  async verify(token: string, use: TokenUse): Promise<TokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [ALGORITHM],
        issuer: this.config.issuer,
        audience: this.config.audience,
        currentDate: this.clock.now(),
        requiredClaims: ["sub", "exp", "jti"],
      });
      if (payload.use !== use) throw new InvalidTokenError("invalid", "토큰 종류가 올바르지 않습니다.");
      return { sub: payload.sub!, use, jti: payload.jti! };
    } catch (e) {
      if (e instanceof InvalidTokenError) throw e;
      if (e instanceof errors.JWTExpired) throw new InvalidTokenError("expired");
      throw new InvalidTokenError("invalid");
    }
  }
}
