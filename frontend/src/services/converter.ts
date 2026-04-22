import { jsPDF } from 'jspdf';
import heic2any from 'heic2any';

// Tipos de arquivo suportados no módulo Demais Atividades
export const DEMAIS_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/xml', 'text/xml', // .xml
];

export const DEMAIS_ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
  '.heic', '.heif', '.pptx', '.ppt', '.docx', '.doc', '.xml'
];

export function isDemaisAllowed(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  return DEMAIS_ALLOWED_EXTENSIONS.includes(ext) || DEMAIS_ALLOWED_TYPES.includes(file.type);
}

// Converte Office/XML para PDF usando ConvertAPI (gratuito com limite)
async function convertOfficeViaApi(file: File): Promise<Blob> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const formData = new FormData();
  formData.append('File', file);

  // Usando API pública do ConvertAPI (substitua pela sua chave se necessário)
  const response = await fetch(`https://v2.convertapi.com/convert/${ext}/to/pdf?Secret=trial`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error(`Falha na conversão via API: ${response.statusText}`);
  const json = await response.json();
  const base64 = json.Files?.[0]?.FileData;
  if (!base64) throw new Error('Resposta inválida da API de conversão');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function convertToPdf(file: File): Promise<Blob> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;

  if (mimeType === 'application/pdf') return file;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (2 * margin);

  try {
    if (mimeType.startsWith('image/')) {
      let imageBlob: Blob = file;
      if (extension === 'heic' || extension === 'heif') {
        const converted = await heic2any({ blob: file, toType: 'image/jpeg' });
        imageBlob = Array.isArray(converted) ? converted[0] : converted;
      }
      const imgData = await blobToBase64(imageBlob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgData;
      });
      const ratio = Math.min(contentWidth / img.width, (pageHeight - 20) / img.height);
      doc.addImage(imgData, 'JPEG', margin, margin, img.width * ratio, img.height * ratio);
      return doc.output('blob');
    }

    // Office e XML: tenta API de conversão
    if (['pptx','ppt','docx','doc','xml'].includes(extension || '')) {
      return await convertOfficeViaApi(file);
    }

    // Fallback texto
    const text = await file.text();
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text.substring(0, 5000), contentWidth);
    doc.text(lines, margin, margin);
    return doc.output('blob');

  } catch (error) {
    console.error(`Erro convertendo ${file.name}:`, error);
    doc.text(`Erro ao converter arquivo: ${file.name}`, margin, margin);
    return doc.output('blob');
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
