import { benefitsSyncQuerySchema } from "@/common/presentation/api/schemas/benefits-schemas";
import { parseSourceList } from "@/features/benefits/domain/sync-sources";
import type { SourceId } from "@/features/benefits/domain/enums";

/** 관리자 동기화 API 의 source 쿼리를 SourceId[] 로 파싱 */
export function sourcesFromSyncQuery(searchParams: URLSearchParams): SourceId[] {
  const parsed = benefitsSyncQuerySchema.parse({ source: searchParams.get("source") ?? undefined });
  return parseSourceList(parsed.source);
}
