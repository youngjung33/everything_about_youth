import { describe, expect, it } from "vitest";
import { DataGoKrError, normalizeServiceKey, parseDataGoKrBody } from "./data-go-kr";

describe("data-go-kr 공통", () => {
  it("서비스키는 디코딩 형태로 통일한다", () => {
    expect(normalizeServiceKey("abc%2Bdef%3D%3D")).toBe("abc+def==");
    expect(normalizeServiceKey("abc+def==")).toBe("abc+def==");
  });
  it("게이트웨이 XML 오류를 예외로 변환한다", () => {
    const xml = `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;
    expect(() => parseDataGoKrBody(xml)).toThrow(DataGoKrError);
  });
  it("odcloud 오류(code<0)와 resultCode 오류를 감지한다", () => {
    expect(() => parseDataGoKrBody('{"code":-4,"msg":"등록되지 않은 인증키 입니다."}')).toThrow(/인증키/);
    expect(() => parseDataGoKrBody('{"response":{"header":{"resultCode":"30","resultMsg":"키 오류"}}}')).toThrow(/키 오류/);
    expect(() => parseDataGoKrBody('{"response":{"header":{"resultCode":"00"},"body":{"item":[]}}}')).not.toThrow();
  });
  it("XML 정상 응답도 객체로 파싱한다", () => {
    const parsed = parseDataGoKrBody(`<response><header><resultCode>00</resultCode></header><body><item><a>1</a></item></body></response>`);
    expect(JSON.stringify(parsed)).toContain('"a":"1"');
  });
});
