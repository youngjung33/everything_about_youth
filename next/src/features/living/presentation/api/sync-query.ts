import { livingSyncQuerySchema } from "@/common/presentation/api/schemas/living-schemas";
import { parseSourceList } from "@/features/living/domain/sync-sources";
import type { SourceId } from "@/features/living/domain/enums";

export function sourcesFromSyncQuery(searchParams: URLSearchParams): SourceId[] {
  const parsed = livingSyncQuerySchema.parse({ source: searchParams.get("source") ?? undefined });
  return parseSourceList(parsed.source);
}
