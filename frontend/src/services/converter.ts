
import { jsPDF } from 'jspdf';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import heic2any from 'heic2any';

export async function convertToPdf(file: File): Promise<Blob> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;

  // If it's already a PDF, just return it
  if (mimeType === 'application/pdf') {
    return file;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (2 * margin);

  try {
    if (mimeType.startsWith('image/')) {
      // Handle images (including WebP, TIFF if browser supports them, HEIC via heic2any)
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

      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = Math.min(contentWidth / imgWidth, (pageHeight - 20) / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      doc.addImage(imgData, 'JPEG', margin, margin, finalWidth, finalHeight);
      return doc.output('blob');
    }

    if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, margin);
      return doc.output('blob');
    }

    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(csv, contentWidth);
      doc.text(lines, margin, margin);
      return doc.output('blob');
    }

    if (extension === 'md') {
      const text = await file.text();
      // Simple markdown to text (stripping some tags for PDF)
      const plainText = text.replace(/[#*`_]/g, '');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(plainText, contentWidth);
      doc.text(lines, margin, margin);
      return doc.output('blob');
    }

    if (['txt', 'rtf', 'html'].includes(extension || '')) {
      const text = await file.text();
      // Strip HTML tags if it's HTML
      const cleanText = extension === 'html' ? text.replace(/<[^>]*>/g, '') : text;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(cleanText, contentWidth);
      doc.text(lines, margin, margin);
      return doc.output('blob');
    }

    // Fallback for other types: try to read as text
    const text = await file.text();
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text.substring(0, 5000), contentWidth);
    doc.text(lines, margin, margin);
    doc.text("\n[Nota: Este arquivo foi convertido via extração de texto genérica]", margin, doc.internal.pageSize.getHeight() - 10);
    return doc.output('blob');

  } catch (error) {
    console.error(`Error converting ${file.name} to PDF:`, error);
    // If conversion fails, return a PDF with an error message
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
