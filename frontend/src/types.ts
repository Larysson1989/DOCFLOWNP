
export type DocCategory = 'DARF' | 'Comprovante' | 'Email' | 'Outros';

export type DocumentItem = {
  id: string;
  file: File;
  originalIndex: number;
  status: "pending" | "processing" | "done" | "error";
  aiCategory?: string;
  aiConfidence?: number;
  isValid: boolean;
  previewUrl: string;
  thumbnailUrl?: string;
  customName: string;
  errorMessage?: string;
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
