export interface SavedPattern {
  name?: string;
  id: string;
  savedAt: Date;
  stitches: string[];
  progress: number;
}
