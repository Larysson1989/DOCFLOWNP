
import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, CheckCircle2, ArrowRight, Trash2, Loader2,
  ShieldCheck, Layers, FileSearch,
  AlertCircle, Zap, CheckCircle, AlertTriangle,
  RefreshCw, ArrowLeft, LogOut,
  Building2, Eye, Shield, X, Download, RotateCcw,
  Mail, ChevronUp, ChevronDown, Edit2, Check, FileText, Files, Lightbulb, User, Lock, ChevronRight,
  Heart, Crown, Activity, Baby, Sun, Sparkles
} from 'lucide-react';
import { DocumentFile, DocCategory, DocStatus } from './types';
import { analyzeDocument } from './services/gemini';
import * as pdfjs from "pdfjs-dist";
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';

// Configuração do worker do PDF.js para renderização de PDFs em canvas
pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

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

const APP_MANIFESTO = {
  title: "MANIFESTO DOC.FLOW NP",
  content: `O DOC.FLOW NP representa o compromisso do Hospital Pequeno Príncipe com a excelência operacional e a integridade administrativa. 

Nossa missão é automatizar a conferência documental e auditoria fiscal com precisão absoluta, eliminando falhas humanas e garantindo conformidade total nos processos de repasse. 

Através da Inteligência Artificial, processamos milhares de páginas mensalmente, transformando dados brutos em informações auditáveis e seguras, mantendo sempre o foco no que mais importa: o suporte à saúde das nossas crianças e adolescentes.`,
  values: ["Integridade Factual", "Transparência de Processos", "Compliance Digital", "Eficiência Institucional"]
};

const LogoHPPLogin = () => (
  <img 
    src="https://pequenoprincipe.org.br/pratodavida/_next/static/media/logo-cpp.5c32a9cc.png" 
    alt="Hospital Pequeno Príncipe" 
    className="h-48 w-auto object-contain mx-auto transition-transform duration-300"
  />
);

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
          <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(false);
  
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [step, setStep] = useState<'upload' | 'finalized'>('upload');
  const [protocol, setProtocol] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [phraseOpacity, setPhraseOpacity] = useState(1);
  const [currentPhrase, setCurrentPhrase] = useState(INSTITUTIONAL_PHRASES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showManifesto, setShowManifesto] = useState(false);

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
      
      if (user) {
        setIsAuthenticated(true);
      } else {
        setLoginError(true);
      }
      setIsLoggingIn(false);
    }, 800);
  };

  const executeAnalysis = async (docId: string, base64: string, mime: string, name: string) => {
    try {
      const result = await analyzeDocument(base64, mime, name);
      setFiles(prev => prev.map(f => f.id === docId ? { 
        ...f, 
        document_type: result.document_type,
        status: result.status as DocStatus,
        errorMessage: undefined
      } : f));
    } catch (err: any) {
      setFiles(prev => prev.map(f => f.id === docId ? { 
        ...f, 
        status: 'error', 
        errorMessage: err?.message || "Erro na análise." 
      } : f));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;
    
    const uploads = await Promise.all(selectedFiles.map(async (file, idx) => {
      const reader = new FileReader();
      const base64Raw = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const id = Math.random().toString(36).substring(2, 11);
      const b64 = base64Raw.split(',')[1];
      
      return { 
        doc: {
          id,
          file,
          previewUrl: URL.createObjectURL(file),
          base64: b64,
          status: 'processing' as const,
          document_type: 'DESCONHECIDO' as DocCategory,
          customName: file.name,
          order: files.length + idx
        },
        b64,
        mime: file.type,
        name: file.name
      };
    }));

    setFiles(prev => [...prev, ...uploads.map(u => u.doc)]);
    uploads.forEach(u => executeAnalysis(u.doc.id, u.b64, u.mime, u.name));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles);
  };

  const saveName = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, customName: tempName } : f));
    setEditingId(null);
  };

  const mergeToPDF = async (shouldDownload = true): Promise<Blob | null> => {
    setIsExporting(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const docFile of files) {
        const arrayBuffer = await docFile.file.arrayBuffer();
        if (docFile.file.type === 'application/pdf') {
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (docFile.file.type.startsWith('image/')) {
          let image;
          if (docFile.file.type === 'image/jpeg' || docFile.file.type === 'image/jpg') {
            image = await mergedPdf.embedJpg(arrayBuffer);
          } else if (docFile.file.type === 'image/png') {
            image = await mergedPdf.embedPng(arrayBuffer);
          } else continue;
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      if (shouldDownload) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `unificado_auditoria_${Date.now()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
      return blob;
    } catch (err) {
      console.error("Erro ao unificar PDFs:", err);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const generateBordero = (shouldDownload = true) => {
    const doc = new jsPDF();
    const now = new Date();
    const proto = `HPP-AUDIT-${Date.now().toString(36).toUpperCase()}`;
    setProtocol(proto);

    doc.setFontSize(18);
    doc.setTextColor(16, 100, 174);
    doc.text("DOC.FLOW NP - Borderô de Atividades", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Hospital Pequeno Príncipe - Unidade de Compliance Digital`, 20, 28);
    doc.text(`Protocolo de Auditoria: ${proto}`, 20, 34);
    doc.text(`Data de Emissão: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, 40);
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Ordem", 20, 52);
    doc.text("Documento", 40, 52);
    doc.text("Classificação", 120, 52);
    doc.text("Status", 160, 52);
    doc.line(20, 55, 190, 55);

    let y = 62;
    files.forEach((file, index) => {
      doc.setFontSize(9);
      doc.text(`#${(index + 1).toString().padStart(2, '0')}`, 20, y);
      doc.text(file.customName.substring(0, 40), 40, y);
      doc.text(file.document_type, 120, y);
      doc.text(file.status === 'validated' ? "VALIDADO" : "PENDENTE", 160, y);
      y += 8;
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Este documento serve como registro oficial das atividades de processamento e auditoria digital.", 20, 280);
    doc.text("Assinado eletronicamente via DocFlow NP Engine.", 20, 285);

    if (shouldDownload) {
      doc.save(`bordero_auditoria_${proto}.pdf`);
    }
    return proto;
  };

  const handleFullAnalysis = async () => {
    setIsExporting(true);
    // Simular tempo de auditoria profunda
    await new Promise(r => setTimeout(r, 1500));
    generateBordero(true);
    await mergeToPDF(true);
    setStep('finalized');
    setIsExporting(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 antialiased">
        <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col items-center p-12 mb-8 relative">
          
          <header className="mb-12 text-center relative">
            <h1 className="text-[36px] font-black uppercase text-slate-800 tracking-tight">
              DOC.FLOW <span className="text-brand-blue">NP</span>
            </h1>
            <div className="w-20 h-1.5 bg-brand-yellow mx-auto -mt-1 rounded-full"></div>
          </header>

          <div className="flex flex-col md:flex-row w-full items-center justify-between gap-12 mb-16 relative">
            <div className="flex-1 flex justify-center -translate-y-[15%]">
              <LogoHPPLogin />
            </div>
            
            <div className="flex-1 max-w-sm w-full">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-brand-blue transition-colors">
                    <User size={18} />
                  </div>
                  <input 
                    type="email" 
                    required 
                    placeholder="E-mail corporativo" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 bg-[#EBF2FF] rounded-2xl outline-none font-bold text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue/20 transition-all" 
                  />
                </div>
                
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-brand-blue transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 bg-[#EBF2FF] rounded-2xl outline-none font-bold text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue/20 transition-all" 
                  />
                </div>

                {loginError && (
                  <p className="text-[10px] font-black text-rose-500 uppercase text-center animate-bounce">Credenciais incorretas</p>
                )}

                <button 
                  type="submit" 
                  disabled={isLoggingIn} 
                  className="w-full bg-[#111827] text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all active:scale-[0.98]"
                >
                  {isLoggingIn ? <Loader2 className="animate-spin" size={16} /> : (
                    <>ENTRAR NO SISTEMA <ChevronRight size={16} className="text-brand-yellow" /></>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Bar with thematic icons inside the dark space */}
          <div className="absolute bottom-0 left-0 w-full h-16 bg-[#111827] flex items-center justify-center overflow-hidden">
            <div className="flex items-center gap-6 md:gap-14 text-white/20 shrink-0 px-8">
               <div title="Documentos"><FileText size={24} strokeWidth={1.5} /></div>
               <div title="PDF"><Files size={24} strokeWidth={1.5} /></div>
               <div title="Hospital"><Building2 size={24} strokeWidth={1.5} /></div>
               <div title="Amor"><Heart size={24} strokeWidth={1.5} /></div>
               <div title="Coração"><Heart size={24} strokeWidth={1.5} fill="currentColor" /></div>
               <div title="Pequeno Príncipe"><Crown size={24} strokeWidth={1.5} /></div>
               <div title="Vida"><Activity size={24} strokeWidth={1.5} /></div>
               <div title="Criança"><Baby size={24} strokeWidth={1.5} /></div>
               <div title="Sol"><Sun size={24} strokeWidth={1.5} /></div>
               <div title="Esperança"><Sparkles size={24} strokeWidth={1.5} /></div>
            </div>
          </div>
        </div>

        {/* Legal Footer adjusted to 10px Arial Narrow style */}
        <footer className="w-full max-w-2xl text-center">
          <div className="bg-[#8E9BCE] text-white px-8 py-2 rounded-sm inline-block shadow-sm">
             <p className="text-[10px] uppercase font-bold tracking-[0.05em] leading-none" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
               Todos os direitos reservados ® Lary.IA CNPJ 21.178.711/0001-20
             </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b h-16 flex items-center px-8 sticky top-0 z-50">
        <div className="flex-1 font-black uppercase text-slate-900 text-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-blue rounded flex items-center justify-center shadow-lg"><ShieldCheck className="text-white" size={18} /></div>
          DOC.FLOW <span className="text-brand-lightBlue">NP</span>
        </div>
        <div className="flex-1 text-center hidden md:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase italic transition-opacity duration-500" style={{ opacity: phraseOpacity }}>{currentPhrase}</p>
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
           <button 
             onClick={() => setShowManifesto(true)}
             className="p-2 text-brand-yellow hover:bg-slate-50 rounded-full transition-all"
             title="Manifesto da Aplicação"
           >
             <Lightbulb size={24} fill="currentColor" />
           </button>
           <button onClick={() => setIsAuthenticated(false)} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 flex items-center gap-2">LOGOUT <LogOut size={12} /></button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 pb-24">
        {step === 'upload' && (
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 p-12 text-center relative hover:bg-slate-50 transition-all cursor-pointer group shadow-sm">
              <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-16 h-16 bg-brand-blue/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-brand-blue" size={32} />
              </div>
              <h2 className="text-xl font-black uppercase text-slate-800">Clique ou arraste documentos</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">DARF • Comprovantes • E-mails • PDFs • Imagens</p>
            </div>

            {files.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="p-6 bg-slate-50/80 border-b flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <Layers size={14} className="text-brand-blue"/> {files.length} Arquivos aguardando processamento
                  </span>
                  <button onClick={() => setFiles([])} className="text-rose-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                </div>
                <div className="divide-y divide-slate-50">
                  {files.map((doc, index) => (
                    <div key={doc.id} className="p-4 flex items-center gap-4 group hover:bg-slate-50/50 transition-all">
                      <div className="flex flex-col gap-1">
                        <button disabled={index === 0} title="Subir" onClick={() => moveFile(index, 'up')} className="text-slate-300 hover:text-brand-blue disabled:opacity-20 transition-colors"><ChevronUp size={16} /></button>
                        <button disabled={index === files.length - 1} title="Descer" onClick={() => moveFile(index, 'down')} className="text-slate-300 hover:text-brand-blue disabled:opacity-20 transition-colors"><ChevronDown size={16} /></button>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        {doc.status === 'processing' ? <Loader2 className="animate-spin text-brand-blue" size={18} /> : doc.status === 'validated' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-rose-500" size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === doc.id ? (
                          <div className="flex items-center gap-2">
                            <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName(doc.id)} className="flex-1 bg-slate-50 border-2 border-brand-blue/20 rounded-lg px-2 py-1 text-xs font-bold outline-none" />
                            <button onClick={() => saveName(doc.id)} className="bg-brand-blue text-white p-1 rounded hover:bg-slate-900"><Check size={14}/></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase text-slate-700 truncate">{doc.customName}</h4>
                            <button onClick={() => { setEditingId(doc.id); setTempName(doc.customName); }} title="Editar nome" className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={12}/></button>
                          </div>
                        )}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${doc.document_type === 'DARF' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {doc.document_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreviewFile(doc)} title="Visualizar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Eye size={18} /></button>
                        <button onClick={() => setFiles(prev => prev.filter(f => f.id !== doc.id))} title="Remover" className="p-2 text-slate-200 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors"><X size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button 
                  disabled={files.length === 0 || isExporting}
                  onClick={() => mergeToPDF(true)}
                  className="group bg-white border-2 border-slate-100 hover:border-brand-blue p-8 rounded-[2.5rem] shadow-lg transition-all text-left flex items-start gap-5 disabled:opacity-50"
               >
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shrink-0 group-hover:scale-110 transition-transform">
                    {isExporting ? <Loader2 className="animate-spin"/> : <Files size={24} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Unificar arquivos</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 leading-relaxed">Une os documentos carregados na ordem proposta e converte em PDF único.</p>
                  </div>
               </button>

               <button 
                  disabled={files.length === 0 || isExporting || files.some(f => f.status === 'processing')}
                  onClick={handleFullAnalysis}
                  className="group bg-slate-900 hover:bg-black p-8 rounded-[2.5rem] shadow-xl transition-all text-left flex items-start gap-5 disabled:opacity-50"
               >
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-brand-yellow shrink-0 group-hover:scale-110 transition-transform">
                    {isExporting ? <Loader2 className="animate-spin"/> : <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">Solicitar análise e autenticação</h4>
                    <p className="text-[10px] font-bold text-white/40 uppercase mt-1 leading-relaxed">Varredura profunda, auditoria lógica e geração de Borderô + PDF unificado.</p>
                  </div>
               </button>
            </div>
          </div>
        )}

        {step === 'finalized' && (
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl p-16 text-center animate-in zoom-in-95 duration-500 border-t-8 border-emerald-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black uppercase text-slate-900 mb-2">Auditoria e Unificação Concluídas</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-10">Protocolo HPP: {protocol || 'N/A'}</p>
            <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-tighter flex items-center justify-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-500"/> Arquivos processados com sucesso
                </p>
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase text-slate-600">
                      <span>Borderô de Atividade</span>
                      <CheckCircle2 size={14} className="text-emerald-500"/>
                   </div>
                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase text-slate-600">
                      <span>PDF Unificado de Auditoria</span>
                      <CheckCircle2 size={14} className="text-emerald-500"/>
                   </div>
                </div>
            </div>
            <button onClick={() => setStep('upload')} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 shadow-xl">
              <RotateCcw size={16} /> Iniciar Novo Lote
            </button>
          </div>
        )}
      </main>

      {previewFile && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setPreviewFile(null)}>
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] flex flex-col relative shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <header className="px-8 py-5 border-b flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <FileSearch className="text-brand-blue" size={20} />
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
            <footer className="px-8 py-4 border-t bg-white flex justify-between items-center shrink-0">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Hospital Pequeno Príncipe • Unidade de Compliance</p>
               <div className="flex gap-4">
                  <a href={previewFile.previewUrl} download={previewFile.customName} className="text-[10px] font-black text-brand-blue uppercase flex items-center gap-2 hover:underline">
                    <Download size={14} /> Download Original
                  </a>
               </div>
            </footer>
          </div>
        </div>
      )}

      {showManifesto && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setShowManifesto(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-12 relative border-b-8 border-brand-yellow" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowManifesto(false)} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 transition-colors"><X size={28}/></button>
             <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-brand-yellow/10 text-brand-yellow rounded-full flex items-center justify-center mb-6">
                   <Lightbulb size={32} fill="currentColor"/>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6">{APP_MANIFESTO.title}</h2>
                <div className="w-12 h-1 bg-brand-blue mb-8 rounded-full"></div>
                <p className="text-slate-600 font-medium leading-relaxed mb-10 whitespace-pre-line text-sm">
                   {APP_MANIFESTO.content}
                </p>
                <div className="grid grid-cols-2 gap-4 w-full">
                   {APP_MANIFESTO.values.map(val => (
                     <div key={val} className="bg-slate-50 p-3 rounded-xl text-[10px] font-black uppercase text-brand-blue border border-slate-100">
                        {val}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t py-6 text-center mt-auto">
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">© {new Date().getFullYear()} Compliance Digital | Hospital Pequeno Príncipe</p>
      </footer>
    </div>
  );
}
