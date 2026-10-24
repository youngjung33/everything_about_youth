/**
 * Next.js 가 서버를 시작할 때 한 번 부른다. 백그라운드 작업(공고 자동 수집)을 켠다.
 * Edge 런타임에서는 DB(네이티브 모듈)를 쓸 수 없으므로 Node.js 에서만 실행한다.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { getRuntimeEnv } = await import("./common/infrastructure/config/runtime-env-config");
    console.info(`[runtime] APP_ENV=${getRuntimeEnv().appEnv}`);
  } catch (error) {
    console.error("[runtime] 환경 설정을 읽지 못했습니다.", error);
    throw error;
  }
  try {
    const { startBackgroundJobs } = await import("./background-jobs");
    await startBackgroundJobs();
  } catch (error) {
    // 자동 수집이 못 켜져도 서버(API)는 떠야 한다.
    console.error("[background-jobs] 시작하지 못했습니다.", error);
  }
}
