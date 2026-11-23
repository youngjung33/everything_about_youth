/** 로그인 실패(계정 없음·비밀번호 틀림·비활성). */
export class AdminAuthError extends Error {
  constructor(readonly reason: "invalid" | "disabled") {
    super(reason);
    this.name = "AdminAuthError";
  }
}

/** 세션 없음·만료·폐기 */
export class AdminSessionError extends Error {
  constructor(readonly reason: "missing" | "expired" | "revoked") {
    super(reason);
    this.name = "AdminSessionError";
  }
}

/** 계정 작업 거부 */
export class AdminAccountError extends Error {
  constructor(
    readonly reason: "exists" | "not_found" | "forbidden" | "weak_password" | "last_super",
  ) {
    super(reason);
    this.name = "AdminAccountError";
  }
}