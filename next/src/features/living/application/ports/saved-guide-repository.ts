export interface SavedGuide {
  guideId: string; // 관심 저장한 안내 ID
  savedAt: string; // 저장 시각(ISO)
}

/** 회원이 관심 생활·행정 안내로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedGuideRepository {
  list(userId: string): Promise<SavedGuide[]>;
  isSaved(userId: string, guideId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, guideId: string, savedAt: string): Promise<void>;
  remove(userId: string, guideId: string): Promise<void>;
}