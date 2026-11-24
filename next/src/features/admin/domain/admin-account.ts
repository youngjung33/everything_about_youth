import type { AdminPermissionsOverride } from "./permissions";
import type { AdminRole } from "./role";

/** DB 의 관리자 계정 한 행 */
export interface AdminAccount {
  loginId: string; // 로그인 ID
  role: AdminRole; // 등급
  disabled: boolean; // 비활성
  isRoot: boolean; // 루트(bootstrap) 계정 — 삭제·강등·비활성·권한 변경 불가
  permissionsOverride: AdminPermissionsOverride | null; // 역할 기본 대비 부분 덮어쓰기
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string | null; // 만든 관리자 ID
}