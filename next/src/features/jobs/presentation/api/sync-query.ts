import { jobsSyncQuerySchema } from "@/common/presentation/api/schemas/jobs-schemas";
import { parseSourceList } from "@/features/jobs/domain/sync-sources";
import type { SourceId } from "@/features/jobs/domain/enums";

export function sourcesFromSyncQuery(searchParams: URLSearchParams): SourceId[] {
  const parsed = jobsSyncQuerySchema.parse({ source: searchParams.get("source") ?? undefined });
  return parseSourceList(parsed.source);
}
