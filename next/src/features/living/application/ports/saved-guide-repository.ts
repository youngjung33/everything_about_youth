export interface SavedGuide {
  guideId: string;
  savedAt: string;
}

export interface SavedGuideRepository {
  list(userId: string): Promise<SavedGuide[]>;
  isSaved(userId: string, guideId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  save(userId: string, guideId: string, savedAt: string): Promise<void>;
  remove(userId: string, guideId: string): Promise<void>;
}
