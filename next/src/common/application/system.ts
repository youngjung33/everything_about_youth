/** 현재 시각 제공(테스트에서 고정 시각 주입). */
export interface Clock {
  now(): Date;
}

/** API·백그라운드 작업 공통 로깅. */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** 운영·테스트 기본 시계. */
export const systemClock: Clock = { now: () => new Date() };

/** 콘솔 로거(운영 기본). */
export const consoleLogger: Logger = {
  info: (m, meta) => console.log(`[info] ${m}`, meta ?? ""),
  warn: (m, meta) => console.warn(`[warn] ${m}`, meta ?? ""),
  error: (m, meta) => console.error(`[error] ${m}`, meta ?? ""),
};

/** 로그 억제용 더미 로거. */
export const silentLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };


