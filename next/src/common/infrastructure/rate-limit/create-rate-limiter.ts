import { FixedWindowRateLimiter, type RateLimiter } from "@/common/application/rate-limit";

/**
 * 요청 제한 구현을 고른다.
 * - 1차: 프로세스 메모리 (`FixedWindowRateLimiter`)
 * - 2차: `REDIS_URL` 이 있으면 Redis 구현으로 교체 (지금은 설정만 감지하고 오류로 알린다)
 */
export function createRateLimiter(env: Record<string, string | undefined> = process.env): RateLimiter | null {
  if (env.RATE_LIMIT_DISABLED === "true") return null;

  const redis = env.REDIS_URL?.trim();
  if (redis) {
    throw new Error(
      "REDIS_URL 은 2차입니다. `infrastructure/rate-limit/redis-rate-limiter.ts` 를 구현한 뒤 createRateLimiter 분기를 연결하세요.",
    );
  }

  return new FixedWindowRateLimiter();
}
