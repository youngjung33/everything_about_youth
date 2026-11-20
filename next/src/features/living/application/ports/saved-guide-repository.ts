/** 저장한 안내 */
export interface SavedGuide {
  guideId: string; // 관심 저장한 안내 ID
  savedAt: string; // 저장 시각(ISO)
}

/** 회원이 관심 생활·행정 안내로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedGuideRepository {
  list(userId: string): Promise<SavedGuide[]>; // 목록 조회
  isSaved(userId: string, guideId: string): Promise<boolean>; // 저장 여부
  count(userId: string): Promise<number>; // 저장 건수
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, guideId: string, savedAt: string): Promise<void>; // 이미 있으면 시각을 바꾸지 않는다
  remove(userId: string, guideId: string): Promise<void>; // 저장 해제
}
