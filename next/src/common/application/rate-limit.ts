/** 같은 키가 `windowMs` 동안 `limit` 번까지 허용되는 규칙 */
export interface RateLimitPolicy {
  /** 키 이름공간. 정책마다 따로 센다. */
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  /** 이번 요청을 센 뒤 남은 횟수 (거절이면 0) */
  remaining: number;
  /** 창이 끝나(횟수가 초기화되)는 시각 (ms) */
  resetAtMs: number;
  /** 거절됐을 때 몇 초 뒤에 다시 보내면 되는지 (허용이면 0) */
  retryAfterSec: number;
}

export interface RateLimiter {
  /** 요청 한 번을 세고 허용 여부를 돌려준다. */
  check(key: string, policy: RateLimitPolicy): RateLimitResult;
}

/**
 * 고정 창(fixed window) 방식의 메모리 제한기.
 *
 * - 인스턴스(프로세스) 하나 안에서만 센다. 서버를 여러 대로 늘리면 `RateLimiter` 를 공유 저장소(Redis 등)
 *   구현으로 바꿔야 한다. (이 인터페이스만 지키면 호출하는 쪽은 그대로다)
 * - 키가 무한히 늘어 메모리를 먹지 않도록, 만료된 키를 정리하고 `maxKeys` 를 넘으면 오래된 키부터 버린다.
 */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAtMs: number }>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 50_000,
  ) {}

  check(key: string, policy: RateLimitPolicy): RateLimitResult {
    const now = this.now();
    const id = `${policy.name}:${key}`;

    let bucket = this.buckets.get(id);
    if (!bucket || bucket.resetAtMs <= now) {
      bucket = { count: 0, resetAtMs: now + policy.windowMs };
      this.buckets.delete(id); // 삽입 순서를 갱신해서 "오래된 순" 정리가 맞도록 한다
      this.buckets.set(id, bucket);
      this.prune(now);
    }

    if (bucket.count >= policy.limit) {
      return {
        allowed: false,
        limit: policy.limit,
        remaining: 0,
        resetAtMs: bucket.resetAtMs,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000)),
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.limit - bucket.count,
      resetAtMs: bucket.resetAtMs,
      retryAfterSec: 0,
    };
  }

  /** 테스트와 점검용 */
  get size(): number {
    return this.buckets.size;
  }

  private prune(now: number): void {
    if (this.buckets.size <= this.maxKeys) return;
    for (const [id, bucket] of this.buckets) {
      if (bucket.resetAtMs <= now) this.buckets.delete(id);
    }
    // 만료된 것을 지워도 많으면 가장 오래된 것부터 버린다. (Map 은 삽입 순서를 유지한다)
    // 매번 전체를 훑지 않도록 한도의 90% 까지 한꺼번에 비운다.
    const target = Math.floor(this.maxKeys * 0.9);
    if (this.buckets.size <= this.maxKeys) return;
    for (const id of this.buckets.keys()) {
      if (this.buckets.size <= target) break;
      this.buckets.delete(id);
    }
  }
}
