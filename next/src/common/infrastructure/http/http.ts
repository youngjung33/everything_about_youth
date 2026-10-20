export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface HttpOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
  /** 응답 본문 디코딩 인코딩 (기본 utf-8). 구형 한국 사이트는 "euc-kr" */
  encoding?: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** 서비스키 등 민감값을 로그/에러에서 가린다. */
export function redactUrl(url: string): string {
  return url.replace(/(serviceKey|ServiceKey|authKey)=[^&]+/g, "$1=***");
}

/** 타임아웃과 지수 백오프 재시도를 가진 GET. 본문을 텍스트로 반환한다. */
export async function httpGetText(url: string, options: HttpOptions = {}): Promise<string> {
  const { timeoutMs = 20_000, retries = 2, retryDelayMs = 800 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    try {
      const res = await fetch(url, { headers: options.headers, signal });
      if (!res.ok) {
        // 4xx(429 제외)는 재시도해도 의미 없음
        const retryable = res.status === 429 || res.status >= 500;
        const err = new HttpError(`HTTP ${res.status} ${redactUrl(url)}`, res.status);
        if (!retryable) throw Object.assign(err, { fatal: true });
        throw err;
      }
      const buf = await res.arrayBuffer();
      return new TextDecoder(options.encoding ?? "utf-8").decode(buf);
    } catch (e) {
      lastError = e;
      if ((e as { fatal?: boolean }).fatal || options.signal?.aborted) break;
      if (attempt < retries) await sleep(retryDelayMs * 2 ** attempt);
    }
  }
  if (lastError instanceof HttpError) throw lastError;
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new HttpError(`요청 실패 ${redactUrl(url)}: ${message}`);
}
