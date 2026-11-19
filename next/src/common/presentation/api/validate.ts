import { z, type ZodIssue } from "zod";
import { ApiError } from "./errors";

/** zod 검증 실패 시 `details.fields` 에만 넣는다. 내부 오류 문구는 노출하지 않는다. */
export function validationDetails(issues: ZodIssue[]) {
  return {
    fields: issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.map(String).join(".") : "_",
      issue: issue.code,
    })),
  };
}

/** 검증 오류를 BAD_REQUEST ApiError 로 올린다. */
export function throwValidationError(issues: ZodIssue[]): never {
  throw new ApiError("BAD_REQUEST", { details: validationDetails(issues) });
}

/** zod 스키마로 값을 검증한다. 실패 시 [throwValidationError]. */
export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throwValidationError(result.error.issues);
  return result.data;
}

/** JSON 본문을 파싱한다. 형식 오류면 BAD_REQUEST. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("BAD_REQUEST");
  }
}

/** 요청 JSON 본문을 읽고 스키마로 검증한다. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  return parseWithSchema(schema, await readJsonBody(request));
}

/** `URLSearchParams` 를 객체로 바꾼다. 같은 키가 여러 번 있으면 문자열 배열이 된다. */
export function searchParamsRecord(params: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    record[key] = all.length === 1 ? all[0]! : all;
  }
  return record;
}

/** 쿼리 문자열을 객체로 만든 뒤 스키마로 검증한다. */
export function parseSearchParams<T>(params: URLSearchParams, schema: z.ZodType<T>): T {
  return parseWithSchema(schema, searchParamsRecord(params));
}

