import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleListPrograms } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertBenefitsEnabled();
  return respond(await handleListPrograms(new URL(request.url).searchParams, getBenefitsContainer()));
});
