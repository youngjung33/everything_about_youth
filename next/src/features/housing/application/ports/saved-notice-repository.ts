export interface SavedNotice {
  noticeId: string;
  savedAt: string;
}

/** 회원이 관심 공고로 저장한 목록. 비회원은 앱 기기에만 둔다. */
export interface SavedNoticeRepository {
  list(userId: string): Promise<SavedNotice[]>;
  isSaved(userId: string, noticeId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  /** 이미 있으면 시각을 바꾸지 않는다. */
  save(userId: string, noticeId: string, savedAt: string): Promise<void>;
  remove(userId: string, noticeId: string): Promise<void>;
}
