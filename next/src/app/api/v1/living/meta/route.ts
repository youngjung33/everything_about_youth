import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getLivingContainer } from "@/features/living/living-container";
import { handleGetMeta } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  await assertLivingEnabled();
  return respond(await handleGetMeta(getLivingContainer()));
});
