export interface SavedPosting {
  postingId: string;
  savedAt: string;
}

export interface SavedJobPostingRepository {
  list(userId: string): Promise<SavedPosting[]>;
  isSaved(userId: string, postingId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  save(userId: string, postingId: string, savedAt: string): Promise<void>;
  remove(userId: string, postingId: string): Promise<void>;
}
