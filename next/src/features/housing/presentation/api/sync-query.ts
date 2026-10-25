import { ApiError } from "@/common/presentation/api/errors";
import { housingSyncQuerySchema } from "@/common/presentation/api/schemas/housing-schemas";
import { parseSearchParams } from "@/common/presentation/api/validate";
import { parseSourceList } from "@/features/housing/infrastructure/config";
import type { SourceId } from "@/features/housing/domain/enums";

export function sourcesFromSyncQuery(params: URLSearchParams): SourceId[] {
  const { source } = parseSearchParams(params, housingSyncQuerySchema);
  try {
    return parseSourceList(source);
  } catch {
    throw new ApiError("BAD_REQUEST", { details: { fields: [{ field: "source", issue: "invalid_enum" }] } });
  }
}
