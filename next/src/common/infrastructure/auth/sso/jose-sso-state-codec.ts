import { jwtVerify, SignJWT } from "jose";
import { SsoError, isSsoProviderId, type SsoState, type SsoStateCodec } from "@/common/application/sso";
import type { Clock } from "@/common/application/system";

const ALGORITHM = "HS256";
const STATE_AUDIENCE = "sso-state";

/** 로그인 창을 열어 두고 돌아오기까지 허용하는 시간 */
export const STATE_TTL_SEC = 10 * 60;

/**
 * state 를 서명한 JWT 로 만든다. 서버가 따로 저장하지 않아도 돌아왔을 때 위조·만료를 검사할 수 있다.
 * 대상(aud)을 액세스/리프레시 토큰과 다르게 두어서, 그 토큰들을 state 로 내밀 수 없다.
 */
export class JoseSsoStateCodec implements SsoStateCodec {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly issuer: string,
    private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async sign(state: SsoState): Promise<string> {
    const nowSec = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT({
      provider: state.provider,
      nonce: state.nonce,
      appRedirect: state.appRedirect,
      challenge: state.challenge,
      callbackUri: state.callbackUri,
    })
      .setProtectedHeader({ alg: ALGORITHM })
      .setIssuer(this.issuer)
      .setAudience(STATE_AUDIENCE)
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + STATE_TTL_SEC)
      .sign(this.key);
  }

  async verify(token: string): Promise<SsoState> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [ALGORITHM],
        issuer: this.issuer,
        audience: STATE_AUDIENCE,
        currentDate: this.clock.now(),
      });
      const { provider, nonce, appRedirect, challenge, callbackUri } = payload;
      if (
        !isSsoProviderId(provider) ||
        typeof nonce !== "string" ||
        typeof appRedirect !== "string" ||
        typeof challenge !== "string" ||
        typeof callbackUri !== "string"
      ) {
        throw new Error("state 내용이 올바르지 않습니다.");
      }
      return { provider, nonce, appRedirect, challenge, callbackUri };
    } catch {
      throw new SsoError("invalid_state", "로그인 요청이 만료되었거나 올바르지 않습니다.");
    }
  }
}
