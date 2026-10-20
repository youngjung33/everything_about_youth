import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/infrastructure/container";
import { handleListNotices } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 공고 목록 (앱용 JSON). 파라미터는 웹 목록 화면과 동일 + pageSize */
export const GET = apiHandler(async (request) => {
  await assertHousingEnabled();
  return respond(await handleListNotices(new URL(request.url).searchParams, getHousingContainer()));
});
