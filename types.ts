
export type DocCategory = 'DARF' | 'COMPROVANTE' | 'FRASE_PADRONIZADA' | 'DESCONHECIDO' | 'DUPLICADO';

export interface ProcessingLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ExtractedData {
  donorName?: string;
  value?: number;
  date?: string;
  identifier?: string; // CPF/CNPJ
}

export interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  semanticType: DocCategory;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'invalid';
  errorMessage?: string;
  order: number;
  extractedData?: ExtractedData;
  analysisNotes?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  missingTypes: DocCategory[];
  duplicates: string[];
  errors: string[];
  discrepancies: string[];
}
