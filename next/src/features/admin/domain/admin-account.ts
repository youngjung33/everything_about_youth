import type { AdminRole } from "./role";

/** DB 의 관리자 계정 한 행 */
export interface AdminAccount {
  loginId: string; // 로그인 ID
  role: AdminRole; // 등급
  disabled: boolean; // 비활성
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string | null; // 만든 관리자 ID
}