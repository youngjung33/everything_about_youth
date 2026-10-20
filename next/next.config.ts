import type { NextConfig } from "next";

/**
 * CORS 는 여기서 설정하지 않는다. 모든 `/api/*` 응답(오류 포함)에 `src/proxy.ts` 의 gateway 가 한곳에서 붙인다.
 * (`src/common/presentation/api/cors.ts`. 운영에서는 API_CORS_ORIGIN 에 앱 도메인을 지정하세요.)
 */
const nextConfig: NextConfig = {
  // 네이티브 모듈은 번들링하지 않고 서버에서 그대로 require 한다.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
