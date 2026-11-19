export interface SavedPosting {
  postingId: string; // 관심 저장한 공고 ID
  savedAt: string; // 저장 시각(ISO)
}

/** 회원이 관심 채용 공고로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedJobPostingRepository {
  list(userId: string): Promise<SavedPosting[]>;
  isSaved(userId: string, postingId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, postingId: string, savedAt: string): Promise<void>;
  remove(userId: string, postingId: string): Promise<void>;
}