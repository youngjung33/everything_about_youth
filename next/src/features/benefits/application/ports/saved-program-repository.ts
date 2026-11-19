/** 관심 정책 한 건 */
export interface SavedProgram {
  programId: string;
  savedAt: string;
}

/** 회원 관심 정책 저장소 포트 */
export interface SavedProgramRepository {
  list(userId: string): Promise<SavedProgram[]>;
  isSaved(userId: string, programId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  save(userId: string, programId: string, savedAt: string): Promise<void>;
  remove(userId: string, programId: string): Promise<void>;
}
