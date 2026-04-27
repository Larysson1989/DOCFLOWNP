// ─── DOC.FLOW v2 — PDF Utilities ─────────────────────────────────────────────

/**
 * Converte File para base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Formata bytes para exibição humana
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Gera ID único para arquivos
 */
export function generateFileId(): string {
  return `df-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Valida se arquivo é PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Valida se arquivo é imagem suportada
 */
export function isSupportedImage(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
}

/**
 * Retorna extensão do arquivo
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Trunca nome do arquivo para exibição
 */
export function truncateFilename(name: string, maxLength = 40): string {
  if (name.length <= maxLength) return name;
  const ext = getFileExtension(name);
  const base = name.substring(0, name.lastIndexOf('.'));
  const truncated = base.substring(0, maxLength - ext.length - 4);
  return `${truncated}...${ext}`;
}

/**
 * Baixa um Blob como arquivo
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
