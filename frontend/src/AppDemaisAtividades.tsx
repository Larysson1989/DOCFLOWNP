import React, { useState, useRef } from 'react';
import {
  Upload, Trash2, Loader2, ShieldCheck, AlertTriangle,
  ChevronUp, ChevronDown, Eye, X, FileText, Files,
  CheckCircle, RotateCcw, Info, File, Presentation,
  FileSpreadsheet, Code
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { convertToPdf, isDemaisAllowed } from './services/converter';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface DocItem {
  id: string;
  file: File;
  index: number;
  isValid: boolean;
  previewUrl: string;
  thumbnailUrl?: string;
  converting: boolean;
  error?: string;
}

function getFileIcon(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['pptx','ppt'].includes(ext || '')) return <Presentation size={28} className="text-orange-400" />;
  if (['docx','doc'].includes(ext || '')) return <FileText size={28} className="text-blue-400" />;
  if (['xml'].includes(ext || '')) return <Code size={28} className="text-purple-400" />;
  if (file.type.startsWith('image/')) return <FileText size={28} className="text-emerald-400" />;
  return <File size={28} className="text-slate-300" />;
}

function getExtLabel(file: File) {
  return (file.name.split('.').pop()?.toUpperCase()) || 'FILE';
}

const SUPPORTED_INFO = [
  { label: 'Apresentações', exts: 'PPTX, PPT' },
  { label: 'Documentos Word', exts: 'DOCX, DOC' },
  { label: 'Dados / Markup', exts: 'XML' },
  { label: 'Imagens', exts: 'JPG, JPEG, PNG, GIF, WEBP, BMP, TIFF, HEIC' },
  { label: 'Documentos', exts: 'PDF' },
];

interface Props {
  onLogout: () => void;
}

export default function AppDemaisAtividades({ onLogout }: Props) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [step, setStep] = useState<'upload' | 'done'>('upload');
  const [protocol, setProtocol] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateThumb = async (file: File, id: string) => {
    if (file.type !== 'application/pdf') return;
    try {
      const ab = await file.arrayBuffer();
      const pdf = await (await pdfjs.getDocument({ data: ab }).promise);
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const thumb = canvas.toDataURL('image/jpeg', 0.6);
      pdf.destroy();
      setDocs(prev => prev.map(d => d.id === id ? { ...d, thumbnailUrl: thumb } : d));
    } catch { /* ignora erro de thumbnail */ }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let hasInvalid = false;
    const newDocs: DocItem[] = files.map((file, i) => {
      const valid = isDemaisAllowed(file);
      if (!valid) hasInvalid = true;
      return {
        id: Math.random().toString(36).slice(2),
        file,
        index: docs.length + i,
        isValid: valid,
        previewUrl: URL.createObjectURL(file),
        converting: false,
      };
    });

    if (hasInvalid) {
      setErrorModal({
        show: true,
        message: 'Alguns arquivos possuem formatos não suportados. Use PDF, imagens, PPTX, PPT, DOCX, DOC ou XML.'
      });
    }

    setDocs(prev => [...prev, ...newDocs]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    newDocs.forEach(d => generateThumb(d.file, d.id));
  };

  const moveFile = (index: number, dir: 'up' | 'down') => {
    const arr = [...docs];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setDocs(arr);
  };

  const removeFile = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));

  const handleUnify = async () => {
    const validDocs = docs.filter(d => d.isValid);
    if (!validDocs.length) return;
    setIsProcessing(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const docItem of validDocs) {
        setDocs(prev => prev.map(d => d.id === docItem.id ? { ...d, converting: true } : d));

        try {
          // Converte o arquivo para PDF (retorna o próprio se já for PDF)
          const pdfBlob = await convertToPdf(docItem.file);
          const ab = await pdfBlob.arrayBuffer();
          const ext = docItem.file.name.split('.').pop()?.toLowerCase();

          if (docItem.file.type === 'application/pdf' || ext === 'pdf') {
            const srcPdf = await PDFDocument.load(ab);
            const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
            pages.forEach(p => mergedPdf.addPage(p));
          } else if (docItem.file.type.startsWith('image/')) {
            let image;
            const mime = docItem.file.type;
            if (mime === 'image/jpeg' || mime === 'image/jpg') {
              image = await mergedPdf.embedJpg(ab);
            } else {
              image = await mergedPdf.embedPng(ab);
            }
            const page = mergedPdf.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
          } else {
            // Office/XML já foram convertidos para PDF pelo convertToPdf
            const convertedPdf = await PDFDocument.load(ab);
            const pages = await mergedPdf.copyPages(convertedPdf, convertedPdf.getPageIndices());
            pages.forEach(p => mergedPdf.addPage(p));
          }

          setDocs(prev => prev.map(d => d.id === docItem.id ? { ...d, converting: false } : d));
        } catch (err: any) {
          setDocs(prev => prev.map(d => d.id === docItem.id ? { ...d, converting: false, error: err.message } : d));
        }
      }

      const bytes = await mergedPdf.save();
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const firstName = docs[0]?.file.name.replace(/\.[^/.]+$/, '') || 'Documentos';
      const link = document.createElement('a');
      link.href = url;
      link.download = `${firstName}_unificado.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setProtocol(`HPP-DOCS-${Date.now().toString(36).toUpperCase()}`);
      setStep('done');
    } catch (err) {
      console.error('Erro ao unificar:', err);
      alert('Erro ao gerar PDF unificado.');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasInvalid = docs.some(d => !d.isValid);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b h-16 flex items-center px-8 sticky top-0 z-50">
        <div className="flex-1 font-black uppercase text-slate-900 text-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white" size={18} />
          </div>
          DOC.FLOW <span className="text-emerald-600 ml-1">DEMAIS ATIVIDADES</span>
        </div>
        <button
          onClick={onLogout}
          className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 flex items-center gap-2"
        >
          TROCAR MÓDULO
        </button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 pb-24">
        {step === 'upload' && (
          <div className="space-y-8">
            {/* Drop zone */}
            <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 p-12 text-center relative hover:bg-slate-50 transition-all cursor-pointer group shadow-sm">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.heif,.pptx,.ppt,.docx,.doc,.xml"
              />
              <div className="w-16 h-16 bg-emerald-600/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-xl font-black uppercase text-slate-800">Clique ou arraste documentos</h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  PDF, Imagens, PPTX, DOCX, XML e mais
                </p>
                {/* Tooltip de informação */}
                <div className="group/info relative z-20">
                  <Info size={14} className="text-slate-300 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-slate-900 text-white text-[9px] rounded-2xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-white/10 text-left">
                    <p className="font-black mb-2 uppercase text-emerald-400 tracking-widest border-b border-white/10 pb-1">
                      Formatos Suportados:
                    </p>
                    <div className="grid grid-cols-1 gap-y-2">
                      {SUPPORTED_INFO.map(item => (
                        <div key={item.label}>
                          <span className="font-black text-white/70">{item.label}: </span>
                          <span className="text-white/50">{item.exts}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-white/30 text-[8px] border-t border-white/10 pt-2">
                      Arquivos Office serão convertidos automaticamente para PDF antes da unificação.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de arquivos */}
            {docs.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 bg-slate-50/80 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <Files size={14} className="text-emerald-600" /> {docs.length} Arquivo{docs.length > 1 ? 's' : ''} no lote
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-600/20 text-emerald-600 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <Upload size={12} /> Adicionar mais
                    </button>
                  </div>
                  <button onClick={() => setDocs([])} className="text-rose-500 hover:scale-110 transition-transform">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {docs.map((doc, index) => (
                    <div
                      key={doc.id}
                      className={`p-5 flex items-center gap-6 group hover:bg-slate-50/80 transition-all ${!doc.isValid ? 'bg-rose-50/30' : ''}`}
                    >
                      {/* Setas de ordenação */}
                      <div className="flex flex-col gap-1">
                        <button disabled={index === 0} onClick={() => moveFile(index, 'up')} className="p-1.5 text-black hover:text-emerald-600 hover:bg-white rounded-md shadow-sm disabled:opacity-0 transition-all">
                          <ChevronUp size={18} strokeWidth={3} />
                        </button>
                        <button disabled={index === docs.length - 1} onClick={() => moveFile(index, 'down')} className="p-1.5 text-black hover:text-emerald-600 hover:bg-white rounded-md shadow-sm disabled:opacity-0 transition-all">
                          <ChevronDown size={18} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Thumbnail / ícone */}
                      <div className="relative w-20 h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner shrink-0 group/thumb">
                        {doc.file.type.startsWith('image/') ? (
                          <img src={doc.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : doc.thumbnailUrl ? (
                          <img src={doc.thumbnailUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-1">
                            {getFileIcon(doc.file)}
                            <span className="text-[8px] font-black text-slate-400 uppercase">{getExtLabel(doc.file)}</span>
                          </div>
                        )}
                        {doc.converting && (
                          <div className="absolute inset-0 bg-emerald-600/40 backdrop-blur-[2px] flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" size={24} />
                          </div>
                        )}
                        {doc.file.type.startsWith('image/') || doc.thumbnailUrl ? (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Eye className="text-white" size={20} />
                          </button>
                        ) : null}
                      </div>

                      {/* Info do arquivo */}
                      <div className="flex-1 min-w-0 py-1">
                        <h4 className="text-sm font-black text-slate-800 truncate max-w-md" title={doc.file.name}>
                          {doc.file.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {(doc.file.size / 1024).toFixed(0)} KB · {getExtLabel(doc.file)}
                        </p>
                        {!doc.isValid && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full w-fit mt-2">
                            <AlertTriangle size={10} />
                            <span className="text-[9px] font-black uppercase">Formato não suportado</span>
                          </div>
                        )}
                        {doc.error && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-600 rounded-full w-fit mt-2">
                            <AlertTriangle size={10} />
                            <span className="text-[9px] font-black uppercase">Erro na conversão</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeFile(doc.id)}
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docs.length > 0 && (
              <button
                disabled={isProcessing || hasInvalid || docs.length === 0}
                onClick={handleUnify}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Files size={24} />}
                <span className="font-black uppercase tracking-widest text-sm">
                  {isProcessing ? 'Convertendo e unificando...' : 'Converter e Unir Documentos'}
                </span>
              </button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl p-16 text-center border-t-8 border-emerald-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black uppercase text-slate-900 mb-2">PDF Gerado com Sucesso</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-10">
              Protocolo HPP: {protocol}
            </p>
            <button
              onClick={() => { setDocs([]); setStep('upload'); }}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 shadow-xl"
            >
              <RotateCcw size={16} /> Novo processamento
            </button>
          </div>
        )}
      </main>

      {/* Modal preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-8" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white w-full max-w-3xl h-[80vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <header className="px-8 py-5 border-b flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-800 truncate max-w-lg">{previewDoc.file.name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full border hover:rotate-90 transition-all">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 p-8">
              <img src={previewDoc.previewUrl} className="max-h-full max-w-full object-contain shadow-2xl rounded-sm border-[10px] border-white" alt="Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Modal erro */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-t-8 border-rose-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-800">Arquivos Inválidos</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ show: false, message: '' })} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">
              Entendido
            </button>
          </div>
        </div>
      )}

      <footer className="bg-white border-t py-6 text-center mt-auto">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Todos os direitos reservados ® Larysson Lara 21.178.711/0001-20
        </p>
      </footer>
    </div>
  );
}
