
export type DocCategory = 'DARF' | 'Comprovante' | 'E-Mail' | 'Outros';

export type DarfData = {
  cpfCnpj?: string;
  nome?: string;
  periodoApuracao?: string;
  vencimento?: string;
  numeroDocumento?: string;
  valorTotal?: string;
  codigoReceita?: string;
};

export type DocumentItem = {
  id: string;
  file: File;
  originalIndex: number;
  status: "pending" | "processing" | "done" | "error";
  aiCategory?: string;
  aiConfidence?: number;
  aiData?: DarfData;
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
