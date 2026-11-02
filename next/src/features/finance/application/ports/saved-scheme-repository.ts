export interface SavedScheme {
  schemeId: string;
  savedAt: string;
}

export interface SavedSchemeRepository {
  list(userId: string): Promise<SavedScheme[]>;
  isSaved(userId: string, schemeId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  save(userId: string, schemeId: string, savedAt: string): Promise<void>;
  remove(userId: string, schemeId: string): Promise<void>;
}
