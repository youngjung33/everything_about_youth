import { getAdminContainer } from "@/features/admin/admin-container";
import { getCommonContainer } from "@/common/infrastructure/container";
import { mapAdminAccountError, requireAdminApi } from "@/features/admin/presentation/admin-auth";
import { parseAdminRole } from "@/features/admin/domain/role";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { z } from "zod";
import { ApiError } from "@/common/presentation/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  role: z.string().optional(),
  disabled: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
});

export const PATCH = apiHandler(async (request, ctx: { params: Promise<{ loginId: string }> }) => {
  const session = await requireAdminApi(request, "account_update");
  const { loginId } = await ctx.params;
  const body = patchSchema.parse(await request.json());
  const patch: { role?: import("@/features/admin/domain/role").AdminRole; disabled?: boolean; newPassword?: string } = {};
  if (body.role !== undefined) {
    const role = parseAdminRole(body.role);
    if (!role) throw new ApiError("BAD_REQUEST");
    patch.role = role;
  }
  if (body.disabled !== undefined) patch.disabled = body.disabled;
  if (body.newPassword !== undefined) patch.newPassword = body.newPassword;
  try {
    await getAdminContainer().updateAccount.execute(session, loginId, patch, getCommonContainer().clock.now().toISOString());
    return respond({ status: 200, body: { ok: true } });
  } catch (e) {
    mapAdminAccountError(e);
  }
});