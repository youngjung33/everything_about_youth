/**
 * 개인정보 같은 민감한 값을 문자열 하나로 암호화/복호화하는 규격.
 *
 * `context` 는 "이 값이 어디에 쓰이는지"(예: `housing.profile`)를 적은 문자열이다. 암호문에 묶여 있어서,
 * 다른 용도(다른 컬럼/다른 사용자)의 암호문을 바꿔치기해서 읽게 만드는 공격을 막는다. 암호화/복호화에 같은 값을 줘야 한다.
 * 사용자 별 값이면 `housing.profile:<기기 id>` 처럼 id 를 붙인다.
 */
export interface FieldCipher {
  encrypt(plain: string, context: string): string;
  /** 키가 다르거나 변조됐거나 context 가 다르면 FieldCipherError */
  decrypt(token: string, context: string): string;
}

export class FieldCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldCipherError";
  }
}
