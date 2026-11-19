import { financeSyncQuerySchema } from "@/common/presentation/api/schemas/finance-schemas";
import { parseSourceList } from "@/features/finance/domain/sync-sources";
import type { SourceId } from "@/features/finance/domain/enums";

/** 관리자 동기화 API 의 source 쿼리를 SourceId[] 로 파싱한다. */
export function sourcesFromSyncQuery(searchParams: URLSearchParams): SourceId[] {
  const parsed = financeSyncQuerySchema.parse({ source: searchParams.get("source") ?? undefined });
  return parseSourceList(parsed.source);
}
