export interface SavedProgram {
  programId: string;
  savedAt: string;
}

export interface SavedProgramRepository {
  list(userId: string): Promise<SavedProgram[]>;
  isSaved(userId: string, programId: string): Promise<boolean>;
  count(userId: string): Promise<number>;
  save(userId: string, programId: string, savedAt: string): Promise<void>;
  remove(userId: string, programId: string): Promise<void>;
}
