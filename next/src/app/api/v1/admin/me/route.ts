import { ADMIN_ROLE_LABELS } from "@/features/admin/domain/role";
import { hasAnyAdminAccess } from "@/features/admin/domain/permissions";
import { requireAdminApi } from "@/features/admin/presentation/admin-auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { ApiError } from "@/common/presentation/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  const session = await requireAdminApi(request, "sync_view");
  if (!hasAnyAdminAccess(session.permissions)) throw new ApiError("FORBIDDEN");
  return respond({
    status: 200,
    body: {
      loginId: session.loginId,
      role: session.role,
      roleLabel: ADMIN_ROLE_LABELS[session.role],
      isRoot: session.isRoot,
      permissions: session.permissions,
    },
  });
});