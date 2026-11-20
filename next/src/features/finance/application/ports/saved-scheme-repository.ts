/** 저장한 금융 상품 */
export interface SavedScheme {
  schemeId: string; // 관심 저장한 상품 ID
  savedAt: string; // 저장 시각(ISO)
}

/** 회원이 관심 상품으로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedSchemeRepository {
  list(userId: string): Promise<SavedScheme[]>; // 목록 조회
  isSaved(userId: string, schemeId: string): Promise<boolean>; // 저장 여부
  count(userId: string): Promise<number>; // 저장 건수
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, schemeId: string, savedAt: string): Promise<void>; // 이미 있으면 시각을 바꾸지 않는다
  remove(userId: string, schemeId: string): Promise<void>; // 저장 해제
}
