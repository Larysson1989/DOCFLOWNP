import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, CheckCircle2, ArrowRight, Trash2, Loader2,
  ShieldCheck, Layers, FileSearch,
  AlertCircle, Zap, CheckCircle, AlertTriangle,
  RefreshCw, ArrowLeft, LogOut,
  Building2, Eye, Shield, X, Download, RotateCcw,
  Mail, ChevronUp, ChevronDown, Edit2, Check, FileText, Files, Lightbulb, User, Lock, ChevronRight,
  Heart, Crown, Activity, Baby, Sun, Sparkles, Info
} from 'lucide-react';
import { DocumentItem, DocCategory } from './types';
import { analyzeDocument } from './services/gemini';
import { convertToPdf } from './services/converter';
import * as pdfjs from "pdfjs-dist";
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const AUTHORIZED_USERS = [
  { email: 'dev@lary.ia.br', password: 'admin' },
  { email: 'nathaly.moco@hpp.org.br', password: 'NaMo#742' },
  { email: 'amanda.magliano@hpp.org.br', password: 'AmaG@538' },
  { email: 'kelly.prado@hpp.org.br', password: 'KelP!964' },
  { email: 'gabriela.heller@hpp.org.br', password: 'GabH#281' }
];

const INSTITUTIONAL_PHRASES = [
  "A tecnologia a serviço do cuidado e da precisão.",
  "Agimos com verdade e respeito, porque confiança é a base de tudo.",
  "Prezamos pela humanização, colocando as pessoas no centro de cada ação.",
  "Excelência na auditoria, segurança no repasse.",
  "Buscamos excelência contínua, evoluindo sempre um passo além."
];

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const PDFCanvasViewer = ({ url }: { url: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderPDF = async () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      setLoading(true);
      setError(false);
      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        if (!isMounted) return;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.className = 'shadow-2xl rounded-sm border bg-white max-w-full';
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          if (isMounted) containerRef.current.appendChild(canvas);
        }
        setLoading(false);
      } catch (err) {
        if (isMounted) setError(true);
        setLoading(false);
      }
    };
    renderPDF();
    return () => { isMounted = false; };
  }, [url]);

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar flex flex-col items-center justify-start p-4 bg-slate-100/50">
      {loading && (
        <div className="flex flex-col items-center gap-3 mt-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#1064AE]" />
          <p className="text-[10px] font-black uppercase text-slate-400">Processando documento...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center gap-3 mt-20 text-rose-500">
          <AlertCircle size={40} />
          <p className="text-xs font-bold uppercase">Erro ao carregar visualização do PDF</p>
        </div>
      )}
      <div ref={containerRef} className="flex flex-col items-center gap-4 py-8" />
    </div>
  );
};

const CATEGORY_PRIORITY: Record<string, number> = {
  'DARF': 1,
  'Comprovante': 2,
  'E-Mail': 3,
  'Outros': 4
};

// ✅ CORREÇÃO: usa includes() para aceitar variações da categoria retornada pela IA
// e garante fallback robusto quando o campo nome não vier preenchido
function buildDarfName(originalFileName: string, nome?: string): string {
  const nomeExtraido = nome?.trim();
  if (nomeExtraido && nomeExtraido.length > 0) {
    return `${nomeExtraido.toUpperCase()} - DARF.pdf`;
  }
  // fallback: preserva nome original do arquivo sem extensão + sufixo DARF
  const base = originalFileName.replace(/\.[^/.]+$/, '');
  return `DARF - ${base}.pdf`;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(false);
  
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [step, setStep] = useState<'upload' | 'finalized'>('upload');
  const [protocol, setProtocol] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<DocumentItem | null>(null);
  const [phraseOpacity, setPhraseOpacity] = useState(1);
  const [currentPhrase, setCurrentPhrase] = useState(INSTITUTIONAL_PHRASES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManifesto, setShowManifesto] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      setPhraseOpacity(0);
      setTimeout(() => {
        setCurrentPhrase(prev => {
          let next;
          do { next = INSTITUTIONAL_PHRASES[Math.floor(Math.random() * INSTITUTIONAL_PHRASES.length)]; } while (next === prev);
          return next;
        });
        setPhraseOpacity(1);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(false);
    setTimeout(() => {
      const user = AUTHORIZED_USERS.find(
        u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword
      );
      if (user) setIsAuthenticated(true);
      else setLoginError(true);
      setIsLoggingIn(false);
    }, 800);
  };

  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const MAX_CONCURRENT = 2;

  useEffect(() => {
    const pendingDocs = documents.filter(d => d.status === 'pending' && d.isValid);
    const activeDocs = documents.filter(d => d.status === 'processing');
    
    if (activeDocs.length < MAX_CONCURRENT && pendingDocs.length > 0) {
      const next = pendingDocs.find(d => !processingQueue.includes(d.id));
      if (next) {
        setProcessingQueue(prev => [...prev, next.id]);
        processDocument(next);
      }
    }
  }, [documents, processingQueue]);

  const processDocument = async (doc: DocumentItem) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d));
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Tempo limite de análise excedido (120s)")), 120000)
    );

    try {
      console.log(`[Queue] Iniciando: ${doc.file.name}`);
      const startTime = Date.now();
      
      let b64 = '';
      let mimeType = doc.file.type;

      if (doc.file.type === 'application/pdf') {
        const convertPromise = (async () => {
          const arrayBuffer = await doc.file.arrayBuffer();
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error("Erro ao criar contexto canvas");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          pdf.destroy();
          return dataUrl.split(',')[1];
        })();
        
        b64 = await Promise.race([convertPromise, timeoutPromise]) as string;
        mimeType = 'image/jpeg';
      } else {
        const reader = new FileReader();
        const readPromise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(doc.file);
        });
        b64 = await Promise.race([readPromise, timeoutPromise]) as string;
      }
      
      const result = await Promise.race([
        analyzeDocument(b64, mimeType, doc.file.name),
        timeoutPromise
      ]) as any;

      console.log(`[Queue] Sucesso: ${doc.file.name} -> categoria: ${result.category} | nome: ${result.data?.nome} (${((Date.now() - startTime)/1000).toFixed(1)}s)`);
      
      setDocuments(prev => {
        const updated = prev.map(d => {
          if (d.id === doc.id) {

            // ✅ CORREÇÃO PRINCIPAL:
            // Usa includes() em vez de === para capturar variações como
            // "DARF", "Darf", "darf ", etc. retornadas pela IA Gemini.
            // Se for DARF, renomeia usando o campo "nome" extraído do documento.
            // O usuário pode editar o nome clicando no ícone de lápis na interface.
            const isDarf = (result.category || '').trim().toLowerCase().includes('darf');

            let newName: string;
            if (isDarf) {
              newName = buildDarfName(doc.file.name, result.data?.nome);
            } else {
              newName = result.suggestedName || d.customName;
            }

            console.log(`[Queue] Nome aplicado: "${newName}" | isDarf: ${isDarf} | categoria retornada: "${result.category}"`);

            return { 
              ...d, 
              status: 'done',
              aiCategory: result.category,
              aiConfidence: result.confidence,
              aiData: result.data,
              customName: newName
            };
          }
          return d;
        });

        return [...updated].sort((a, b) => {
          const getPriority = (doc: DocumentItem) => {
            if (doc.status !== 'done') return 99;
            const cat = (doc.aiCategory || '').trim().toLowerCase();
            if (cat.includes('darf')) return 1;
            if (cat.includes('comprovante')) return 2;
            if (cat.includes('mail')) return 3;
            return 4;
          };
          const pA = getPriority(a);
          const pB = getPriority(b);
          if (pA !== pB) return pA - pB;
          return a.originalIndex - b.originalIndex;
        });
      });
    } catch (err: any) {
      console.error(`[Queue] Erro em ${doc.file.name}:`, err.message);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { 
        ...d, 
        status: 'error', 
        errorMessage: err?.message || "Erro na análise." 
      } : d));
    } finally {
      setProcessingQueue(prev => prev.filter(id => id !== doc.id));
    }
  };

  const generatePdfThumbnail = async (file: File): Promise<string | undefined> => {
    if (file.type !== 'application/pdf') return undefined;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        pdf.destroy();
        return dataUrl;
      }
    } catch (err) {
      console.error("[Thumb] Erro ao gerar miniatura do PDF:", err);
    }
    return undefined;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const newDocs: DocumentItem[] = [];
    let hasInvalid = false;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const isValid = allowedTypes.includes(file.type);
      if (!isValid) hasInvalid = true;

      const id = Math.random().toString(36).substring(2, 11);
      const previewUrl = URL.createObjectURL(file);
      
      newDocs.push({
        id,
        file,
        originalIndex: documents.length + i,
        status: 'pending',
        isValid,
        previewUrl,
        customName: file.name
      });
    }

    if (hasInvalid) {
      setErrorModal({ 
        show: true, 
        message: 'Alguns arquivos possuem formatos não suportados. Por favor, utilize apenas PDF, JPG ou PNG.' 
      });
    }

    setDocuments(prev => [...prev, ...newDocs]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    newDocs.filter(d => d.file.type === 'application/pdf').forEach(async (doc) => {
      const thumb = await generatePdfThumbnail(doc.file);
      if (thumb) {
        setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, thumbnailUrl: thumb } : d));
      }
    });
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newDocs = [...documents];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newDocs.length) return;
    const [movedItem] = newDocs.splice(index, 1);
    newDocs.splice(targetIndex, 0, movedItem);
    setDocuments(newDocs);
  };

  const saveName = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, customName: tempName } : d));
    setEditingId(null);
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);
    try {
      let allAnalyzed = false;
      let attempts = 0;
      while (!allAnalyzed && attempts < 20) {
        const unfinished = documents.filter(d => (d.status === 'pending' || d.status === 'processing') && d.isValid);
        if (unfinished.length === 0) {
          allAnalyzed = true;
        } else {
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }
      }

      const mergedPdf = await PDFDocument.create();
      
      for (const docItem of documents) {
        const arrayBuffer = await docItem.file.arrayBuffer();
        if (docItem.file.type === 'application/pdf') {
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (docItem.file.type.startsWith('image/')) {
          let image;
          if (docItem.file.type === 'image/jpeg' || docItem.file.type === 'image/jpg') {
            image = await mergedPdf.embedJpg(arrayBuffer);
          } else if (docItem.file.type === 'image/png') {
            image = await mergedPdf.embedPng(arrayBuffer);
          } else continue;
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const darfDoc = documents.find(d => (d.aiCategory || '').toLowerCase().includes('darf'));
      const baseName = darfDoc 
        ? darfDoc.customName.replace(/\.[^/.]+$/, "") 
        : documents[0]?.customName.replace(/\.[^/.]+$/, "") || "Documento";
      const fileName = `${baseName} Unificado.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      setProtocol(`HPP-UNIFY-${Date.now().toString(36).toUpperCase()}`);
      setStep('finalized');
    } catch (err) {
      console.error("Erro ao unificar documentos:", err);
      alert("Erro ao gerar PDF unificado.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const hasInvalidFiles = documents.some(d => !d.isValid);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 antialiased">
        <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col items-center p-12 mb-8 relative">
          <header className="mb-12 text-center relative">
            <h1 className="text-[36px] font-black uppercase text-slate-800 tracking-tight">
              DOC.FLOW <span className="text-[#1064AE]">NP</span>
            </h1>
            <div className="w-20 h-1.5 bg-brand-yellow mx-auto -mt-1 rounded-full"></div>
          </header>

          <div className="flex flex-col md:flex-row w-full items-center justify-between gap-12 mb-16 relative">
            <div className="flex-1 flex justify-center -translate-y-[15%]">
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZ3shKbxmtt8-3491Yd_wsh0H313NXxRLr5w&s" 
                alt="HPP" 
                className="h-48 w-auto object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 max-w-sm w-full">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" required placeholder="E-mail corporativo" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-[#EBF2FF] rounded-2xl outline-none font-bold text-sm text-slate-700" />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" required placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-[#EBF2FF] rounded-2xl outline-none font-bold text-sm text-slate-700" />
                </div>
                {loginError && <p className="text-[10px] font-black text-rose-500 uppercase text-center">Credenciais incorretas</p>}
                <button type="submit" disabled={isLoggingIn} className="w-full bg-[#111827] text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all">
                  {isLoggingIn ? <Loader2 className="animate-spin" size={16} /> : <>ENTRAR NO SISTEMA <ChevronRight size={16} className="text-brand-yellow" /></>}
                </button>
              </form>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-16 bg-[#111827] flex items-center justify-center overflow-hidden">
            <div className="flex items-center gap-6 text-white/20 shrink-0 px-8">
              <FileText size={24} /><Files size={24} /><Building2 size={24} /><Heart size={24} /><Crown size={24} /><Activity size={24} /><Baby size={24} /><Sun size={24} /><Sparkles size={24} />
            </div>
          </div>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">Todos os direitos reservados ® Larysson Lara 21.178.711/0001-20</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b h-16 flex items-center px-8 sticky top-0 z-50">
        <div className="flex-1 font-black uppercase text-slate-900 text-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1064AE] rounded flex items-center justify-center shadow-lg"><ShieldCheck className="text-white" size={18} /></div>
          DOC.FLOW <span className="text-[#2284BD]">NP</span>
        </div>
        <div className="flex-1 text-center hidden md:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase italic transition-opacity duration-500" style={{ opacity: phraseOpacity }}>{currentPhrase}</p>
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
          <button onClick={() => setIsAuthenticated(false)} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 flex items-center gap-2">LOGOUT <LogOut size={12} /></button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 pb-24">
        {step === 'upload' && (
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 p-12 text-center relative hover:bg-slate-50 transition-all cursor-pointer group shadow-sm">
              <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-16 h-16 bg-[#1064AE]/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-[#1064AE]" size={32} />
              </div>
              <h2 className="text-xl font-black uppercase text-slate-800">Clique ou arraste documentos</h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Formatos aceitos: PDF, JPG, PNG</p>
                <div className="group/info relative z-20">
                  <Info size={14} className="text-slate-300 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-slate-900 text-white text-[9px] rounded-2xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-white/10 text-left">
                    <p className="font-black mb-2 uppercase text-brand-yellow tracking-widest border-b border-white/10 pb-1">Formatos Suportados:</p>
                    <div className="grid grid-cols-1 gap-y-1.5 opacity-90">
                      <div>• PDF (Documentos Auditáveis)</div>
                      <div>• Imagens (JPG, PNG)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {documents.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 bg-slate-50/80 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <Layers size={14} className="text-[#1064AE]"/> {documents.length} Arquivos no lote
                    </span>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#1064AE]/20 text-[#1064AE] text-[10px] font-black uppercase rounded-lg hover:bg-[#1064AE] hover:text-white transition-all shadow-sm"
                    >
                      <Upload size={12} /> Adicionar mais arquivos
                    </button>
                  </div>
                  <button onClick={() => setDocuments([])} className="text-rose-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                </div>
                <div className="divide-y divide-slate-100">
                  {documents.map((doc, index) => (
                    <div key={doc.id} className={`p-5 flex items-center gap-6 group hover:bg-slate-50/80 transition-all relative ${!doc.isValid ? 'bg-rose-50/30' : ''}`}>
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={index === 0} 
                          onClick={() => moveFile(index, 'up')} 
                          className="p-1.5 text-black hover:text-[#1064AE] hover:bg-white rounded-md shadow-sm disabled:opacity-0 transition-all"
                        >
                          <ChevronUp size={18} strokeWidth={3} />
                        </button>
                        <button 
                          disabled={index === documents.length - 1} 
                          onClick={() => moveFile(index, 'down')} 
                          className="p-1.5 text-black hover:text-[#1064AE] hover:bg-white rounded-md shadow-sm disabled:opacity-0 transition-all"
                        >
                          <ChevronDown size={18} strokeWidth={3} />
                        </button>
                      </div>

                      <div className="relative w-20 h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner shrink-0 group/thumb">
                        {doc.file.type.startsWith('image/') ? (
                          <img src={doc.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : doc.thumbnailUrl ? (
                          <img src={doc.thumbnailUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                            <FileText className="text-slate-300" size={32} />
                            <span className="text-[8px] font-black text-slate-400 uppercase mt-1">PDF</span>
                          </div>
                        )}
                        {doc.status === 'processing' && (
                          <div className="absolute inset-0 bg-[#1064AE]/40 backdrop-blur-[2px] flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" size={24} />
                          </div>
                        )}
                        <button 
                          onClick={() => setPreviewFile(doc)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Eye className="text-white" size={20} />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-3 mb-2">
                          {editingId === doc.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input 
                                autoFocus 
                                value={tempName} 
                                onChange={e => setTempName(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && saveName(doc.id)} 
                                className="flex-1 bg-white border-2 border-[#1064AE] rounded-xl px-3 py-1.5 text-xs font-bold outline-none shadow-lg" 
                              />
                              <button onClick={() => saveName(doc.id)} className="bg-[#1064AE] text-white p-2 rounded-xl hover:bg-slate-900 shadow-md"><Check size={16}/></button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 group/name">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-800 truncate max-w-md" title={doc.customName}>
                                  {doc.customName}
                                </h4>
                                <button
                                  onClick={() => { setEditingId(doc.id); setTempName(doc.customName); }}
                                  className="opacity-0 group-hover/name:opacity-100 p-1 text-slate-400 hover:text-[#1064AE] transition-all shrink-0"
                                  title="Editar nome"
                                >
                                  <Edit2 size={14}/>
                                </button>
                              </div>
                              {(doc.customName !== doc.file.name) && (
                                <span className="text-[10px] font-medium text-slate-400 truncate max-w-xs italic" title={doc.file.name}>
                                  {doc.file.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {!doc.isValid && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full">
                              <AlertTriangle size={10} />
                              <span className="text-[9px] font-black uppercase tracking-wider">Formato Não Suportado</span>
                            </div>
                          )}
                          
                          {(doc.aiCategory || '').toLowerCase().includes('darf') && doc.aiData && (
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 w-full">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Contribuinte</span>
                                <span className="text-[10px] font-black text-slate-700 truncate">{doc.aiData.nome || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">CPF/CNPJ</span>
                                <span className="text-[10px] font-black text-slate-700">{doc.aiData.cpfCnpj || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Vencimento</span>
                                <span className="text-[10px] font-black text-slate-700">{doc.aiData.vencimento || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Valor</span>
                                <span className="text-[10px] font-black text-emerald-600">R$ {doc.aiData.valorTotal || '0,00'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFile(doc.id)} 
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                          title="Remover"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <button 
                disabled={isProcessing || hasInvalidFiles}
                onClick={handleProcessAll}
                className="w-full bg-[#1064AE] hover:bg-[#0d528f] text-white p-6 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Files size={24} />}
                <span className="font-black uppercase tracking-widest text-sm">Unir Documentos</span>
              </button>
            )}
          </div>
        )}

        {step === 'finalized' && (
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl p-16 text-center border-t-8 border-emerald-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black uppercase text-slate-900 mb-2">Processamento concluído com sucesso</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-10">Protocolo HPP: {protocol}</p>
            <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-tighter flex items-center justify-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500"/> Auditoria Digital Finalizada
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase text-slate-600">
                  <span>Relatório de Processamento (Borderô Auditável)</span>
                  <CheckCircle2 size={14} className="text-emerald-500"/>
                </div>
              </div>
            </div>
            <button onClick={() => { setDocuments([]); setStep('upload'); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 shadow-xl">
              <RotateCcw size={16} /> Iniciar novo processamento
            </button>
          </div>
        )}
      </main>

      {previewFile && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-8" onClick={() => setPreviewFile(null)}>
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] flex flex-col relative shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <header className="px-8 py-5 border-b flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <FileSearch className="text-[#1064AE]" size={20} />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest truncate max-w-lg">{previewFile.customName}</h3>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full transition-all border hover:rotate-90">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-hidden bg-slate-50 relative">
              {previewFile.file.type === 'application/pdf' ? (
                <PDFCanvasViewer url={previewFile.previewUrl} />
              ) : (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-8 bg-slate-100/50">
                  <img src={previewFile.previewUrl} className="max-h-full max-w-full object-contain shadow-2xl rounded-sm border-[10px] border-white" alt="Preview" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorModal.show && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-t-8 border-rose-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-800">Atenção: Arquivos Inválidos</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ show: false, message: '' })} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Entendido</button>
          </div>
        </div>
      )}

      <footer className="bg-white border-t py-6 text-center mt-auto">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Todos os direitos reservados ® Larysson Lara 21.178.711/0001-20</p>
      </footer>
    </div>
  );
}
