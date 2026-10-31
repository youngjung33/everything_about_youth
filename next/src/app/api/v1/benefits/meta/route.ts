import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleGetMeta } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  await assertBenefitsEnabled();
  return respond(await handleGetMeta(getBenefitsContainer()));
});
