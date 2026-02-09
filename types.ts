
export type DocCategory = 'DARF' | 'COMPROVANTE' | 'EMAIL' | 'DESCONHECIDO';
export type DocStatus = 'validated' | 'invalid' | 'error' | 'processing' | 'pending';

export interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  document_type: DocCategory;
  status: DocStatus;
  customName: string;
  order: number;
  errorMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingTypes: DocCategory[];
  errors: string[];
}
