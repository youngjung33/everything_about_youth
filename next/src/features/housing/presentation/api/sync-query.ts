import { ApiError } from "@/common/presentation/api/errors";
import { housingSyncQuerySchema } from "@/common/presentation/api/schemas/housing-schemas";
import { parseSearchParams } from "@/common/presentation/api/validate";
import { parseSourceList } from "@/features/housing/domain/sync-sources";
import type { SourceId } from "@/features/housing/domain/enums";

/** 관리자 동기화 API 의 source 쿼리를 SourceId[] 로 파싱한다. */
export function sourcesFromSyncQuery(params: URLSearchParams): SourceId[] {
  const { source } = parseSearchParams(params, housingSyncQuerySchema);
  try {
    return parseSourceList(source);
  } catch {
    throw new ApiError("BAD_REQUEST", { details: { fields: [{ field: "source", issue: "invalid_enum" }] } });
  }
}
