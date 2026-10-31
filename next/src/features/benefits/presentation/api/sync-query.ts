import { benefitsSyncQuerySchema } from "@/common/presentation/api/schemas/benefits-schemas";
import { parseSourceList } from "@/features/benefits/domain/sync-sources";
import type { SourceId } from "@/features/benefits/domain/enums";

export function sourcesFromSyncQuery(searchParams: URLSearchParams): SourceId[] {
  const parsed = benefitsSyncQuerySchema.parse({ source: searchParams.get("source") ?? undefined });
  return parseSourceList(parsed.source);
}
