import { financeSyncQuerySchema } from "@/common/presentation/api/schemas/finance-schemas";
import { parseSourceList } from "@/features/finance/domain/sync-sources";
import type { SourceId } from "@/features/finance/domain/enums";

export function sourcesFromSyncQuery(searchParams: URLSearchParams): SourceId[] {
  const parsed = financeSyncQuerySchema.parse({ source: searchParams.get("source") ?? undefined });
  return parseSourceList(parsed.source);
}
