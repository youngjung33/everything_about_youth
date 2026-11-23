import { getAdminContainer } from "@/features/admin/admin-container";
import { getCommonContainer } from "@/common/infrastructure/container";
import { mapAdminAccountError, mapAdminLoginError, requireAdminApi } from "@/features/admin/presentation/admin-auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export const POST = apiHandler(async (request) => {
  const session = await requireAdminApi(request, "password_change_self");
  const body = schema.parse(await request.json());
  try {
    await getAdminContainer().changePassword.execute(
      session.loginId,
      body.currentPassword,
      body.newPassword,
      getCommonContainer().clock.now().toISOString(),
    );
    return respond({ status: 200, body: { ok: true } });
  } catch (e) {
    try {
      mapAdminLoginError(e);
    } catch {
      mapAdminAccountError(e);
    }
  }
});