export interface SavedScheme {
  schemeId: string; // 관심 저장한 상품 ID
  savedAt: string; // 저장 시각(ISO)
}

/** 회원이 관심 상품으로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedSchemeRepository {
  list(userId: string): Promise<SavedScheme[]>;
  isSaved(userId: string, schemeId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, schemeId: string, savedAt: string): Promise<void>;
  remove(userId: string, schemeId: string): Promise<void>;
}