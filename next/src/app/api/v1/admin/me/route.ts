import { ADMIN_ROLE_LABELS } from "@/features/admin/domain/role";
import { requireAdminApi } from "@/features/admin/presentation/admin-auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  const session = await requireAdminApi(request, "sync_view");
  return respond({
    status: 200,
    body: { loginId: session.loginId, role: session.role, roleLabel: ADMIN_ROLE_LABELS[session.role] },
  });
});