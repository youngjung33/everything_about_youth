/** 저장한 공고 */
export interface SavedNotice {
  noticeId: string; // 공고 id
  savedAt: string; // 저장 시각(ISO)
}

/** 회원이 관심 공고로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedNoticeRepository {
  list(userId: string): Promise<SavedNotice[]>; // 목록 조회
  isSaved(userId: string, noticeId: string): Promise<boolean>; // 저장 여부
  count(userId: string): Promise<number>; // 저장 건수
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, noticeId: string, savedAt: string): Promise<void>; // 저장
  remove(userId: string, noticeId: string): Promise<void>; // 저장 해제
}
