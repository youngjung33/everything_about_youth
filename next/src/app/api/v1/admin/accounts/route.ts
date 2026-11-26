import { parseAdminRole } from "@/features/admin/domain/role";
import { getAdminContainer } from "@/features/admin/admin-container";
import { getCommonContainer } from "@/common/infrastructure/container";
import { mapAdminAccountError, requireAdminApi } from "@/features/admin/presentation/admin-auth";
import { toAdminAccountApiItem } from "@/features/admin/presentation/admin-account-api";
import { adminDevDiagnosticsEnabled } from "@/features/admin/presentation/admin-dev-diagnostics";
import { parseAdminAccountListSort } from "@/features/admin/presentation/admin-account-list-sort";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { z } from "zod";
import { ApiError } from "@/common/presentation/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  const session = await requireAdminApi(request, "account_list");
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "1" && adminDevDiagnosticsEnabled(session);
  const listSort = parseAdminAccountListSort(url.searchParams.get("sort"), url.searchParams.get("order"));
  const rows = await getAdminContainer().listAccounts.execute(listSort);
  return respond({
    status: 200,
    body: {
      items: rows.map((a) => toAdminAccountApiItem(session, a, { verbose })),
      meta: {
        readOnly: session.permissions.accounts.page !== "edit",
        verbose,
        sort: listSort.field,
        order: listSort.order,
      },
    },
  });
});

const createSchema = z.object({
  loginId: z.string().min(2),
  password: z.string().min(6),
  role: z.string(),
  permissionsOverride: z.record(z.unknown()).nullable().optional(),
});

export const POST = apiHandler(async (request) => {
  const session = await requireAdminApi(request, "account_create");
  const body = createSchema.parse(await request.json());
  const role = parseAdminRole(body.role);
  if (!role) throw new ApiError("BAD_REQUEST");
  try {
    await getAdminContainer().createAccount.execute(
      { loginId: session.loginId, role: session.role, permissions: session.permissions },
      {
        loginId: body.loginId,
        password: body.password,
        role,
        createdBy: session.loginId,
        permissionsOverride: (body.permissionsOverride as import("@/features/admin/domain/permissions").AdminPermissionsOverride) ?? null,
      },
      getCommonContainer().clock.now().toISOString(),
    );
    return respond({ status: 201, body: { ok: true } });
  } catch (e) {
    mapAdminAccountError(e);
  }
});