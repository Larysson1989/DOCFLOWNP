
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  FileText, Upload, CheckCircle2, ArrowRight, Trash2, Loader2,
  ShieldCheck, Layers, XCircle, FileSearch,
  AlertCircle, Zap, CheckCircle, AlertTriangle, Search,
  ChevronUp, ChevronDown, Lightbulb, Info, Plus, MessageCircle,
  RefreshCw, Clock, ChevronRight, ArrowLeft, Files, HelpCircle, Lock, User, LogOut
} from 'lucide-react';
import { DocumentFile, ProcessingLog, DocCategory, ValidationResult } from './types';
import { analyzeDocument } from './services/gemini';
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

const INSTITUTIONAL_PHRASES = [
  "Somos um time, e juntos vamos cada vez mais longe.",
  "Agimos com verdade e respeito, porque confiança é a base de tudo.",
  "Prezamos pela humanização, colocando as pessoas no centro de cada ação.",
  "Vestimos a camisa do Pequeno Príncipe, entregando o nosso melhor todos os dias.",
  "Buscamos excelência contínua, evoluindo sempre um passo além.",
  "Temos paixão pelo desafio, transformando obstáculos em oportunidades.",
  "Curtimos a jornada com felicidade, celebrando conquistas e aprendizados."
];

// Componente de Logo Institucional - Ajustado para melhor ocupação de espaço
const LogoHPP = () => (
  <div className="flex flex-col items-center justify-center w-full">
    <div className="group transition-all duration-500 hover:scale-105">
      <img 
        src="https://cbgolfe.com.br/wp-content/uploads/2017/12/logo-hpp-materia-site.jpg" 
        alt="Hospital Pequeno Príncipe" 
        className="h-32 md:h-52 w-auto object-contain drop-shadow-sm"
      />
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'finalized'>('upload');
  const [protocol, setProtocol] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showManifesto, setShowManifesto] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [finalFileName, setFinalFileName] = useState<string>('');

  // Ticker Logic
  const [currentPhrase, setCurrentPhrase] = useState(INSTITUTIONAL_PHRASES[0]);
  const [phraseOpacity, setPhraseOpacity] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setPhraseOpacity(0);
      setTimeout(() => {
        setCurrentPhrase(prev => {
          let next;
          do {
            next = INSTITUTIONAL_PHRASES[Math.floor(Math.random() * INSTITUTIONAL_PHRASES.length)];
          } while (next === prev);
          return next;
        });
        setPhraseOpacity(1);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const addLog = useCallback((message: string, type: ProcessingLog['type'] = 'info') => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev]);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'dev@lary.ia.br' && loginPassword === 'admin') {
      setIsAuthenticated(true);
      setLoginError('');
      addLog("Usuário autenticado com sucesso.", "success");
    } else {
      setLoginError('Credenciais inválidas. Verifique os dados e tente novamente.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    resetFlow();
  };

  const resetFlow = () => {
    files.forEach(doc => URL.revokeObjectURL(doc.previewUrl));
    setFiles([]);
    setLogs([]);
    setIsProcessing(false);
    setStep('upload');
    setProtocol('');
    setShowWarningModal(false);
    setShowHelpTooltip(false);
    setFinalFileName('');
    setExpandedCard(null);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
    });
  };

  const processFileAnalysis = async (doc: DocumentFile) => {
    try {
      setFiles(prev => prev.map(f => f.id === doc.id ? { ...f, status: 'processing', errorMessage: undefined } : f));
      const result = await analyzeDocument(doc.base64, doc.file.type);
      setFiles(prev => prev.map(f => f.id === doc.id ? { 
        ...f, 
        semanticType: result.semanticType,
        description: result.description,
        extractedData: result.extractedData,
        status: result.semanticType === 'DESCONHECIDO' ? 'invalid' : 'completed'
      } : f));
      addLog(`Documento ${doc.file.name} identificado como: ${result.description}`, 'success');
    } catch (err: any) {
      const isQuota = err?.message?.includes('quota');
      const errorMsg = isQuota ? 'Quota da API excedida. Tentando recuperar...' : 'Erro na análise do motor de IA';
      addLog(`Falha em ${doc.file.name}: ${errorMsg}`, 'error');
      setFiles(prev => prev.map(f => f.id === doc.id ? { 
        ...f, 
        status: 'invalid', 
        description: errorMsg,
        errorMessage: err?.message
      } : f));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;
    addLog(`Ingerindo ${selectedFiles.length} documentos...`, 'info');

    const newDocs: DocumentFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const reader = new FileReader();
      const base64Raw = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const optimizedBase64 = file.type.startsWith('image/') ? await compressImage(base64Raw) : base64Raw.split(',')[1];
      
      const doc: DocumentFile = {
        id: Math.random().toString(36).substring(2, 11),
        file,
        previewUrl: URL.createObjectURL(file),
        base64: optimizedBase64,
        status: 'pending',
        semanticType: 'DESCONHECIDO',
        order: files.length + i
      };
      newDocs.push(doc);
    }

    setFiles(prev => [...prev, ...newDocs]);

    for (const doc of newDocs) {
      await processFileAnalysis(doc);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles.map((f, i) => ({ ...f, order: i })));
  };

  const startAutomation = async () => {
    if (files.length === 0) return;
    const pendingAnalyses = files.filter(f => f.status === 'pending' || f.status === 'processing');
    if (pendingAnalyses.length > 0) {
      addLog("Aguarde a identificação de todos os documentos antes de prosseguir.", "warning");
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    addLog("Iniciando auditoria cruzada de valores...", "info");
    
    setTimeout(() => {
      setIsProcessing(false);
      addLog(`Auditoria de conformidade concluída.`, "success");
    }, 1200);
  };

  const validation: ValidationResult = useMemo(() => {
    const types = files.map(f => f.semanticType);
    const missing: DocCategory[] = [];
    const discrepancies: string[] = [];
    
    if (!types.includes('DARF')) missing.push('DARF');
    if (!types.includes('COMPROVANTE')) missing.push('COMPROVANTE');
    if (!types.includes('FRASE_PADRONIZADA')) missing.push('FRASE_PADRONIZADA');

    const darf = files.find(f => f.semanticType === 'DARF');
    const comp = files.find(f => f.semanticType === 'COMPROVANTE');

    if (darf && comp) {
      if (darf.extractedData?.value && comp.extractedData?.value) {
        if (Math.abs(darf.extractedData.value - comp.extractedData.value) > 0.05) {
          discrepancies.push(`Divergência de Valor: DARF (R$ ${darf.extractedData.value.toFixed(2)}) vs Comprovante (R$ ${comp.extractedData.value.toFixed(2)})`);
        }
      }
    }

    return {
      isValid: missing.length === 0 && discrepancies.length === 0 && !files.some(f => f.status === 'invalid'),
      missingTypes: missing,
      duplicates: [],
      errors: files.filter(f => f.status === 'invalid').map(f => f.file.name),
      discrepancies
    };
  }, [files]);

  const generateSystemFileName = () => {
    const donorDoc = files.find(f => f.semanticType === 'DARF') || files.find(f => f.semanticType === 'COMPROVANTE');
    const rawName = donorDoc?.extractedData?.donorName || "DESCONHECIDO";
    const sanitizedName = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").split('_')[0];
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '');
    const statusSuffix = validation.isValid ? 'ok' : 'pc';
    return `docflownp_${sanitizedName}_${dateStr}_${statusSuffix}`;
  };

  const handleRequestUnification = () => {
    if (!validation.isValid) setShowWarningModal(true);
    else finalizeProcess();
  };

  const finalizeProcess = async () => {
    setIsProcessing(true);
    const newProtocol = `HPP-${Date.now().toString(36).toUpperCase()}`;
    const fileName = generateSystemFileName();
    setProtocol(newProtocol);
    setFinalFileName(fileName);
    addLog("Gerando arquivo PDF institucional...", "info");
    try {
      await generateMergedPDF(newProtocol, fileName);
      setStep('finalized');
      setShowWarningModal(false);
      addLog(`Arquivo ${fileName}.pdf pronto para arquivamento.`, "success");
    } catch (error) {
      addLog("Erro crítico na unificação dos documentos.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMergedPDF = async (prot: string, fileName: string) => {
    const mergedPdf = await PDFDocument.create();
    const summaryDoc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const xCol1 = 20;
    const xCol2 = 80;
    const xCol3 = 170;
    const wCol1 = 55;
    const wCol2 = 85;

    summaryDoc.setFillColor(16, 100, 174); 
    summaryDoc.rect(0, 0, 210, 45, 'F');
    summaryDoc.setTextColor(255, 255, 255);
    summaryDoc.setFontSize(14);
    summaryDoc.setFont("helvetica", "bold");
    summaryDoc.text("HOSPITAL PEQUENO PRÍNCIPE", 15, 20);
    summaryDoc.setFontSize(15);
    summaryDoc.text("Relatório de Unificação e Compliance Documental", 15, 30);
    summaryDoc.setFontSize(8);
    summaryDoc.setFont("helvetica", "normal");
    const statusText = validation.isValid ? 'CONFORME' : 'PENDENTE DE AJUSTE';
    const metadataLine = `PROTOCOLO: ${prot} | EMISSÃO: ${new Date().toLocaleString('pt-BR')} | STATUS: ${statusText}`;
    summaryDoc.text(metadataLine, 15, 38);
    summaryDoc.setFillColor(251, 219, 20); 
    summaryDoc.rect(0, 45, 210, 3, 'F');

    summaryDoc.setTextColor(15, 23, 42);
    summaryDoc.setFontSize(13);
    summaryDoc.setFont("helvetica", "bold");
    summaryDoc.text("1. INVENTÁRIO DE DOCUMENTOS", 15, 60);
    
    let y = 70;
    summaryDoc.setFontSize(8);
    summaryDoc.setFillColor(241, 245, 249);
    summaryDoc.rect(15, y, 180, 10, 'F');
    summaryDoc.setTextColor(71, 85, 105);
    summaryDoc.text("TIPO / IDENTIFICAÇÃO", xCol1, y + 6.5);
    summaryDoc.text("DETALHE DO ARQUIVO", xCol2, y + 6.5);
    summaryDoc.text("VALOR AUDITADO", xCol3, y + 6.5);
    
    y += 15;

    files.forEach((f) => {
      summaryDoc.setFont("helvetica", "normal");
      summaryDoc.setTextColor(30, 41, 59);
      
      const typeText = f.description || f.semanticType;
      const fileNameText = f.file.name;
      const valueText = f.extractedData?.value ? `R$ ${f.extractedData.value.toFixed(2)}` : '---';

      const typeLines = summaryDoc.splitTextToSize(typeText, wCol1);
      const detailLines = summaryDoc.splitTextToSize(fileNameText, wCol2);

      summaryDoc.text(typeLines, xCol1, y);
      summaryDoc.text(detailLines, xCol2, y);
      summaryDoc.text(valueText, xCol3, y);

      const lineCount = Math.max(typeLines.length, detailLines.length);
      const rowHeight = lineCount * 5;

      y += rowHeight + 3;

      if (y > 270) { 
        summaryDoc.addPage(); 
        y = 20; 
        summaryDoc.setFillColor(241, 245, 249);
        summaryDoc.rect(15, y, 180, 10, 'F');
        summaryDoc.text("TIPO / IDENTIFICAÇÃO", xCol1, y + 6.5);
        summaryDoc.text("DETALHE DO ARQUIVO", xCol2, y + 6.5);
        summaryDoc.text("VALOR AUDITADO", xCol3, y + 6.5);
        y += 15;
      }
    });

    y += 5;
    if (y > 250) { summaryDoc.addPage(); y = 20; }
    summaryDoc.setFont("helvetica", "bold");
    summaryDoc.setFontSize(13);
    summaryDoc.setTextColor(15, 23, 42);
    summaryDoc.text("2. NOTAS DE CONFORMIDADE", 15, y);
    summaryDoc.setDrawColor(226, 232, 240);
    summaryDoc.line(15, y + 2, 195, y + 2);
    y += 10;
    summaryDoc.setFontSize(8.5);
    summaryDoc.setFont("helvetica", "normal");
    
    if (validation.isValid) {
      summaryDoc.setTextColor(22, 101, 52);
      summaryDoc.text("✓ TODOS OS DOCUMENTOS ESTÃO EM PLENA CONFORMIDADE INSTITUCIONAL.", 15, y);
    } else {
      summaryDoc.setTextColor(185, 28, 28);
      let errorY = y;
      [...validation.discrepancies, ...validation.missingTypes.map(m => `Pendente: Documento do tipo ${m} não identificado`)].forEach(issue => {
        summaryDoc.text(`[!] ${issue}`, 15, errorY);
        errorY += 5;
      });
      y = errorY;
    }

    y += 10;
    if (y > 240) { summaryDoc.addPage(); y = 20; }
    summaryDoc.setFont("helvetica", "bold");
    summaryDoc.setFontSize(13);
    summaryDoc.setTextColor(15, 23, 42);
    summaryDoc.text("3. RASTREABILIDADE DO PROCESSO (LOG)", 15, y);
    summaryDoc.line(15, y + 2, 195, y + 2);
    y += 10;
    
    summaryDoc.setFont("courier", "normal");
    summaryDoc.setFontSize(7);
    summaryDoc.setTextColor(100, 116, 139);
    logs.slice(0, 15).reverse().forEach(log => {
      const logLine = `[${log.timestamp}] [${log.type.toUpperCase()}] - ${log.message}`;
      summaryDoc.text(logLine, 15, y);
      y += 4;
      if (y > 280) { summaryDoc.addPage(); y = 20; }
    });

    summaryDoc.setFont("helvetica", "normal");
    summaryDoc.setTextColor(148, 163, 184);
    summaryDoc.setFontSize(7);
    const footerText = "DOCUMENTO GERADO PELO SISTEMA DOC.FLOW NP - HPP. VALIDADE INSTITUCIONAL PARA FINS DE AUDITORIA.";
    summaryDoc.text(footerText, 15, 288);

    const summaryPdfBytes = summaryDoc.output('arraybuffer');
    const summaryPdf = await PDFDocument.load(summaryPdfBytes);
    const summaryPageCount = summaryPdf.getPageCount();
    for (let i = 0; i < summaryPageCount; i++) {
      const [page] = await mergedPdf.copyPages(summaryPdf, [i]);
      mergedPdf.addPage(page);
    }

    for (const doc of files) {
      try {
        const fileBuffer = await doc.file.arrayBuffer();
        if (doc.file.type === 'application/pdf') {
          const sourcePdf = await PDFDocument.load(fileBuffer);
          const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
        } else if (doc.file.type.startsWith('image/')) {
          const img = doc.file.type.includes('png') ? await mergedPdf.embedPng(fileBuffer) : await mergedPdf.embedJpg(fileBuffer);
          const page = mergedPdf.addPage();
          const dims = img.scaleToFit(page.getWidth() - 40, page.getHeight() - 40);
          page.drawImage(img, { x: 20, y: page.getHeight() - dims.height - 20, width: dims.width, height: dims.height });
        }
      } catch(e) { console.error(e); }
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.pdf`;
    link.click();
  };

  const manifestoCards = [
    {
      title: "O que é o DOC.FLOW NP?",
      summary: "O DOC.FLOW NP é uma ferramenta criada para organizar, registrar e dar rastreabilidade a processos documentais sensíveis...",
      content: "O DOC.FLOW NP é uma ferramenta de apoio institucional que organiza e registra atividades de unificação documental, especialmente em contextos que exigem responsabilidade, transparência e controle, como processos ligados a recursos públicos e impacto social."
    },
    {
      title: "O que o DOC.FLOW faz?",
      summary: "O DOC.FLOW NP apoia a organização de documentos, registra atividades e reduz erros operacionais...",
      content: "A ferramenta analisa documentos, identifica tipos documentais, apoia a unificação em PDF e registra a atividade realizada, gerando documentos institucionais como o Borderô de Atividade. É fundamental reforçar que a decisão final é sempre humana."
    },
    {
      title: "O que o DOC.FLOW NÃO faz?",
      summary: "O DOC.FLOW NP não substitui pessoas, nem assume decisões legais, fiscais ou contábeis...",
      content: "O sistema não valida juridicamente documentos, não substitui contadores, advogados ou Conselhos, e não decide pela completude ou correção das informações. Esta é uma escolha consciente de ética e governança institucional."
    },
    {
      title: "Nosso propósito",
      summary: "Nosso propósito é trazer clareza, ordem e responsabilidade a processos que hoje dependem de esforço manual...",
      content: "Buscamos reduzir improvisos, minimizar o erro humano e oferecer segurança operacional a instituições que precisam fazer tudo certo, priorizando a conformidade técnica acima da simples velocidade."
    },
    {
      title: "Quem atendemos?",
      summary: "Atendemos instituições, equipes e profissionais que lidam com processos documentais sensíveis...",
      content: "Focamos em instituições do terceiro setor, organizações que recebem recursos via destinação do IRPF, além de fundos, conselhos e equipes administrativas que priorizam governança e rastreabilidade total."
    },
    {
      title: "O ecossistema Lary.IA",
      summary: "O DOC.FLOW NP faz parte do ecossistema Lary.IA, que cria soluções de IA com responsabilidade...",
      content: "O Lary.IA utiliza a Inteligência Artificial como infraestrutura de confiança e apoio à decisão humana, focando na organização de processos complexos — nunca como uma substituição irresponsável de profissionais."
    }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white rounded-[3rem] md:rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
            
            {/* Header Centrado */}
            <div className="pt-16 pb-8 flex flex-col items-center justify-center text-center px-6">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none mb-2">
                DOC.FLOW <span className="text-brand-lightBlue">NP</span>
              </h1>
              <div className="h-1.5 w-24 bg-brand-yellow rounded-full mb-8" />
            </div>

            {/* Conteúdo Principal: Logo Esquerda, Login Direita */}
            <div className="flex flex-col md:flex-row items-center justify-center pb-20 px-10 md:px-20 gap-12 md:gap-16">
              
              {/* Área da Logo - Ajustada para melhor distribuição no espaço retangular */}
              <div className="flex-1 flex justify-center items-center min-h-[200px]">
                <LogoHPP />
              </div>

              {/* Formulário à Direita */}
              <div className="flex-1 w-full max-w-md">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input 
                      type="email" 
                      placeholder="Usuário (E-mail)"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-semibold focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 transition-all shadow-sm"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      type="password" 
                      placeholder="Senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-semibold focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 transition-all shadow-sm"
                    />
                  </div>

                  {loginError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in shake-in duration-300">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{loginError}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-black transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] group active:scale-95"
                  >
                    ENTRAR NO SISTEMA <ChevronRight className="w-5 h-5 text-brand-yellow group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>

            </div>

            {/* Footer do Card */}
            <div className="bg-slate-900 p-8 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
                Hospital Pequeno Príncipe — <span className="text-brand-yellow">Excelência e Conformidade</span>
              </p>
            </div>
          </div>
        </div>
        
        <footer className="mt-16 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] opacity-60">
            Todos os direitos reservados | Larysson Lara CNPJ 21.178.711/0001-20
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      {showManifesto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-brand-blue p-8 text-white relative shrink-0">
              <button onClick={() => { setShowManifesto(false); setExpandedCard(null); }} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                <XCircle className="w-8 h-8" />
              </button>
              <Lightbulb className="w-12 h-12 text-brand-yellow mb-4" />
              <h2 className="text-3xl font-black uppercase tracking-tight">DOC.FLOW NP</h2>
              <p className="text-white/70 font-medium text-sm">Criado no ecossistema Lary.IA</p>
              <p className="text-[10px] uppercase font-black tracking-widest text-brand-yellow/80 mt-2 italic">“Tecnologia que respeita processos, pessoas e responsabilidades.”</p>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-slate-50/50">
              {manifestoCards.map((card, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${expandedCard === idx ? 'border-brand-blue shadow-lg' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <button 
                    onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
                    className="w-full text-left p-5 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-brand-blue uppercase mb-1">{card.title}</h3>
                      <p className={`text-xs font-medium text-slate-500 leading-relaxed ${expandedCard === idx ? 'hidden' : 'line-clamp-2'}`}>
                        {card.summary}
                      </p>
                    </div>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${expandedCard === idx ? 'bg-brand-blue text-white rotate-90' : 'bg-slate-100 text-slate-400'}`}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                  
                  {expandedCard === idx && (
                    <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-slate-100 mb-4" />
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">
                        {card.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <a 
                href="https://wa.me/5541997015424?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20a%20DOC.FLOW%20NP" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 text-xs shadow-xl"
              >
                <MessageCircle className="w-4 h-4" /> FALAR COM DESENVOLVEDOR
              </a>
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(225,29,72,0.3)] border-4 border-rose-600">
            <div className="bg-rose-50 p-8 text-rose-600 text-center border-b border-rose-100">
              <XCircle className="w-14 h-14 mx-auto mb-3" />
              <h2 className="text-xl font-black uppercase tracking-tight">ATENÇÃO, REVISE OS DOCUMENTOS</h2>
              <p className="text-[10px] font-bold text-rose-500 mt-1 leading-tight uppercase tracking-wider">Verifique se todos os documentos estão devidamente anexados antes de prosseguir.</p>
            </div>
            <div className="p-8">
              <div className="space-y-3 mb-8">
                {validation.missingTypes.map(t => (
                  <div key={t} className="flex items-center gap-3 text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <AlertCircle className="w-4 h-4 shrink-0" /> Informação: Faltando documento: <span className="underline">{t}</span>
                  </div>
                ))}
                {validation.discrepancies.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {d}
                  </div>
                ))}
                
                <div className="flex flex-col items-center gap-4 pt-4">
                  <button 
                    onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                    className="flex items-center gap-2 text-[11px] font-black text-brand-blue hover:text-brand-lightBlue transition-all group px-4 py-2 rounded-full hover:bg-brand-blue/5"
                  >
                    <HelpCircle className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
                    ENTENDER O QUE ESTÁ PENDENTE
                  </button>

                  {showHelpTooltip && (
                    <div className="w-full p-6 bg-slate-900 text-white text-[10px] rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-top-4 border border-slate-700">
                      <div className="flex items-start gap-4 text-left">
                        <Info className="w-6 h-6 text-brand-yellow shrink-0 mt-1" />
                        <div className="space-y-3">
                          <p className="font-black text-brand-yellow uppercase tracking-widest text-[11px]">Por que falta a Frase Padronizada?</p>
                          <p className="opacity-90 leading-relaxed text-[11px] font-medium">
                            Este documento contém a <b>anuência institucional e o aceite do conselho</b>. 
                            Sem este selo de conformidade, o processo de auditoria do HPP não pode ser validado juridicamente.
                          </p>
                          <div className="h-px bg-slate-700 w-full" />
                          <p className="opacity-90 leading-relaxed font-bold italic flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-brand-yellow" />
                            Certifique-se de realizar o upload do arquivo contendo a declaração assinada.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid gap-3 pt-4">
                <button onClick={finalizeProcess} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-lg text-sm flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-yellow" /> PROSSEGUIR COM RESSALVAS (_pc)
                </button>
                <button onClick={() => { setShowWarningModal(false); setShowHelpTooltip(false); }} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 text-sm">CANCELAR E AJUSTAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Compacto - DOC.FLOW NP */}
      <header className="bg-white border-b-2 border-slate-100 shadow-sm h-16 flex-shrink-0 z-50 sticky top-0 px-4 md:px-12">
        <div className="max-w-full mx-auto h-full flex items-center justify-between gap-8">
          
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                DOC.FLOW <span className="text-brand-lightBlue">NP</span>
              </h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestão e Auditoria HPP</p>
            </div>
            <div className="w-px h-8 bg-slate-100 ml-2 hidden sm:block" />
          </div>

          <div className="flex-1 text-center hidden md:flex items-center justify-center">
             <div className="px-6 py-1.5 bg-slate-50/80 rounded-full border border-slate-100/50 max-w-2xl overflow-hidden">
               <p 
                 className="text-[10px] font-bold text-slate-500 italic transition-all duration-500 ease-in-out uppercase tracking-wide truncate"
                 style={{ opacity: phraseOpacity }}
               >
                 {currentPhrase}
               </p>
             </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end px-3 border-r border-slate-100 mr-1 hidden sm:flex">
              <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Operador</span>
              <span className="text-[10px] font-bold text-slate-600 leading-none lowercase">{loginEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowManifesto(true)} 
                className="w-9 h-9 bg-white hover:bg-slate-50 rounded-lg flex items-center justify-center transition-all group border border-slate-100"
                title="Manifesto Doc.Flow"
              >
                <Lightbulb className="w-4 h-4 text-brand-blue group-hover:fill-brand-yellow transition-all" />
              </button>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <LogOut className="w-3 h-3" /> SAIR
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px] flex">
          <div className="flex-1 bg-brand-blue" />
          <div className="flex-1 bg-brand-yellow" />
          <div className="flex-1 bg-brand-lightBlue" />
        </div>
      </header>

      <main className="flex-1 w-full mx-auto p-4 md:p-8 overflow-hidden flex flex-col items-center">
        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar h-full pb-8 w-full max-w-7xl">
          
          {step === 'upload' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 w-full items-center">
              
              <div className="relative group w-full">
                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 py-16 px-12 text-center hover:border-brand-blue hover:bg-brand-blue/[0.01] transition-all relative cursor-pointer shadow-sm overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
                  <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1064AE 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                  
                  <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
                    <div className="w-24 h-24 bg-brand-blue/5 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 mb-8 border border-brand-blue/10">
                      <Upload className="w-12 h-12 text-brand-blue" />
                    </div>
                    
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3 uppercase">Upload de Documentos</h2>
                      <p className="text-slate-400 font-bold text-xs leading-relaxed uppercase tracking-[0.2em]">
                        Arraste seus arquivos aqui ou clique para selecionar.
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/5 rounded-full border border-brand-blue/10">
                        <Zap className="w-4 h-4 fill-brand-yellow text-brand-yellow animate-pulse" />
                        <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">
                          Processamento via Lary.IA (Gemini 2.5)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {files.length > 0 && (
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500 w-full">
                  <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/40">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-brand-blue/10 rounded-2xl">
                        <Layers className="w-6 h-6 text-brand-blue" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 leading-none mb-1">Fila de Conferência</span>
                        <span className="text-sm font-black text-slate-700">{files.length} documento(s) em análise</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative group flex-1 md:flex-none">
                        <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <button className="w-full md:w-auto bg-slate-100 text-slate-500 px-6 py-4 rounded-2xl text-[10px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200 uppercase tracking-widest">
                          <Plus className="w-4 h-4" /> NOVO ARQUIVO
                        </button>
                      </div>
                      <button 
                        onClick={startAutomation} 
                        disabled={files.some(f => f.status === 'processing' || f.status === 'pending')}
                        className="flex-1 md:flex-none bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em]"
                      >
                        {files.some(f => f.status === 'processing' || f.status === 'pending') ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-brand-yellow" />
                        )} 
                        VALIDAR CONFORMIDADE
                      </button>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {files.map((doc, idx) => (
                      <div key={doc.id} className={`p-5 flex items-center gap-6 group transition-colors ${doc.status === 'invalid' ? 'bg-rose-50/20' : 'hover:bg-slate-50/60'}`}>
                        <div className="flex flex-col gap-1 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
                          <button disabled={idx === 0} onClick={() => moveFile(idx, 'up')} className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                          <button disabled={idx === files.length - 1} onClick={() => moveFile(idx, 'down')} className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${doc.status === 'invalid' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400 group-hover:text-brand-blue group-hover:bg-brand-blue/10'}`}>
                          {doc.status === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-black text-slate-800 truncate mb-1 uppercase tracking-tight">{doc.file.name}</div>
                          <div className="min-h-[16px] flex items-center gap-3">
                            {doc.status === 'processing' || doc.status === 'pending' ? (
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest italic animate-pulse">
                                Extraindo Metadados Técnicos...
                              </span>
                            ) : doc.status === 'completed' ? (
                              <div className="text-[10px] font-bold text-brand-lightBlue uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                {doc.description || doc.semanticType}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-rose-600 uppercase flex items-center gap-1 tracking-widest">
                                  <XCircle className="w-3.5 h-3.5" /> FALHA NA LEITURA
                                </span>
                                <button onClick={() => processFileAnalysis(doc)} className="text-[9px] font-black text-rose-600 hover:underline">REPROCESSAR</button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {doc.extractedData?.value && doc.status === 'completed' && (
                          <div className="hidden sm:flex flex-col items-end mr-6">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Valor Auditado</span>
                            <span className="text-sm font-black text-slate-700">R$ {doc.extractedData.value.toFixed(2)}</span>
                          </div>
                        )}

                        <button 
                          onClick={() => setFiles(prev => prev.filter(f => f.id !== doc.id))} 
                          className="p-4 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 w-full">
              <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FBDB14 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                  <div className="flex flex-col relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-brand-yellow/10 rounded-2xl border border-brand-yellow/20">
                        <ShieldCheck className="w-8 h-8 text-brand-yellow" />
                      </div>
                      <div>
                        <h3 className="font-black text-2xl uppercase tracking-tighter">Painel de Auditoria Cruzada</h3>
                        <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-[0.3em]">
                          Verificação de integridade documental e financeira
                        </p>
                      </div>
                    </div>
                  </div>
                  {isProcessing && <Loader2 className="w-8 h-8 animate-spin text-brand-yellow" />}
                </div>
                
                <div className="divide-y divide-slate-50">
                  {files.map((doc, idx) => (
                    <div key={doc.id} className="p-8 flex items-start gap-8 hover:bg-slate-50/40 transition-colors">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 text-sm font-black shrink-0 border border-slate-100 shadow-sm">{idx + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="text-lg font-black text-slate-800 uppercase tracking-tight">{doc.file.name}</div>
                          <span className={`text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest ${doc.status === 'invalid' ? 'bg-rose-100 text-rose-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
                            {doc.semanticType}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                           {doc.extractedData?.donorName && (
                             <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Doador/Contribuinte</p>
                               <p className="text-sm font-bold text-slate-700 truncate">{doc.extractedData.donorName}</p>
                             </div>
                           )}
                           {doc.extractedData?.value && (
                             <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Montante Processado</p>
                               <p className="text-sm font-black text-brand-blue">R$ {doc.extractedData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                             </div>
                           )}
                        </div>
                      </div>
                      <div className="pt-2">
                        {doc.status === 'invalid' ? (
                          <XCircle className="w-8 h-8 text-rose-300" />
                        ) : (
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!isProcessing && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                  <button 
                    onClick={() => setStep('upload')}
                    className="px-10 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] hover:bg-slate-200 transition-all flex items-center gap-3 uppercase tracking-[0.2em]"
                  >
                    <ArrowLeft className="w-5 h-5" /> VOLTAR AO UPLOAD
                  </button>
                  <button onClick={handleRequestUnification} className="px-20 py-6 rounded-[2rem] font-black text-sm shadow-2xl transition-all flex items-center gap-5 group bg-slate-900 text-white hover:bg-black hover:scale-[1.02] active:scale-95 uppercase tracking-[0.3em]">
                    <Files className="w-6 h-6 text-brand-yellow" /> UNIFICAR E FINALIZAR <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'finalized' && (
            <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-emerald-50 p-16 md:p-24 text-center animate-in zoom-in-95 duration-700 w-full max-w-5xl mx-auto">
              <div className="w-28 h-28 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner relative">
                <CheckCircle className="w-14 h-14 text-emerald-500" />
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-3 uppercase">Processo Finalizado!</h2>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] mb-12">Compliance Documental Ativo</p>
              
              <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 text-left mb-12 shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <span className="text-[10px] font-black text-slate-300 uppercase block tracking-[0.3em] mb-3">Protocolo Gerado</span>
                    <span className="font-mono font-black text-slate-900 text-2xl">{protocol}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-300 uppercase block tracking-[0.3em] mb-3">Arquivo de Saída</span>
                    <span className="font-mono font-bold text-slate-500 text-sm break-all uppercase">{finalFileName}.pdf</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={resetFlow} 
                className="bg-brand-blue text-white px-16 py-6 rounded-[2rem] font-black text-xs hover:bg-slate-900 transition-all shadow-2xl active:scale-95 uppercase tracking-[0.3em]"
              >
                NOVA UNIFICAÇÃO
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-10 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">
            Todos os direitos reservados | Larysson Lara CNPJ 21.178.711/0001-20
          </p>
        </div>
      </footer>
    </div>
  );
}
