/** 관심 정책 한 건 */
export interface SavedProgram {
  programId: string; // programId
  savedAt: string; // savedAt
}

/** 회원 관심 정책 저장소 포트 */
export interface SavedProgramRepository {
  list(userId: string): Promise<SavedProgram[]>; // 목록 조회
  isSaved(userId: string, programId: string): Promise<boolean>; // 저장 여부
  count(userId: string): Promise<number>; // 저장 건수
  save(userId: string, programId: string, savedAt: string): Promise<void>; // 저장
  remove(userId: string, programId: string): Promise<void>; // 저장 해제
}
