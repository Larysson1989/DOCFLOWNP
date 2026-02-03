
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  FileText, Upload, CheckCircle2, ArrowRight, Trash2, Loader2,
  ShieldCheck, Layers, XCircle, FileSearch,
  AlertCircle, Zap, CheckCircle, AlertTriangle, Search,
  ChevronUp, ChevronDown, Lightbulb, Info, Plus, MessageCircle,
  RefreshCw, Clock
} from 'lucide-react';
import { DocumentFile, ProcessingLog, DocCategory, ValidationResult } from './types';
import { analyzeDocument } from './services/gemini';
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

export default function App() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'finalized'>('upload');
  const [protocol, setProtocol] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showManifesto, setShowManifesto] = useState(false);
  const [finalFileName, setFinalFileName] = useState<string>('');

  const addLog = useCallback((message: string, type: ProcessingLog['type'] = 'info') => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev]);
  }, []);

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
    
    // Ingestão inicial
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

    // Processamento sequencial para evitar estourar quota (Rate Limiting preventivo)
    for (const doc of newDocs) {
      await processFileAnalysis(doc);
      // Pequena pausa entre requisições para estabilidade
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
    
    // CABEÇALHO
    summaryDoc.setFillColor(16, 100, 174); // Azul HPP
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

    // FAIXA AMARELA
    summaryDoc.setFillColor(251, 219, 20); // Amarelo HPP
    summaryDoc.rect(0, 45, 210, 3, 'F');

    // 1. INVENTÁRIO
    summaryDoc.setTextColor(15, 23, 42);
    summaryDoc.setFontSize(13);
    summaryDoc.setFont("helvetica", "bold");
    summaryDoc.text("1. INVENTÁRIO DE DOCUMENTOS", 15, 60);
    
    let y = 70;
    summaryDoc.setFontSize(8);
    summaryDoc.setFillColor(241, 245, 249);
    summaryDoc.rect(15, y, 180, 10, 'F');
    summaryDoc.text("TIPO / IDENTIFICAÇÃO", 20, y + 6.5);
    summaryDoc.text("DETALHE DO ARQUIVO", 60, y + 6.5);
    summaryDoc.text("VALOR AUDITADO", 165, y + 6.5);
    y += 15;

    files.forEach((f) => {
      summaryDoc.setFont("helvetica", "normal");
      summaryDoc.setTextColor(30, 41, 59);
      const detailText = f.description || f.semanticType;
      const fileNameText = f.file.name;
      const valueText = f.extractedData?.value ? `R$ ${f.extractedData.value.toFixed(2)}` : '---';
      
      summaryDoc.text(detailText, 20, y);
      summaryDoc.text(summaryDoc.splitTextToSize(fileNameText, 100), 60, y);
      summaryDoc.text(valueText, 165, y);
      y += 8;
      if (y > 270) { summaryDoc.addPage(); y = 20; }
    });

    // 2. NOTAS DE CONFORMIDADE
    y += 10;
    if (y > 250) { summaryDoc.addPage(); y = 20; }
    summaryDoc.setFont("helvetica", "bold");
    summaryDoc.setFontSize(13);
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

    // 3. LOG DE RASTREABILIDADE
    y += 15;
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
    const footerText = "DOCUMENTO GERADO PELO SISTEMA DOCFLOW NP - HPP. VALIDADE INSTITUCIONAL PARA FINS DE AUDITORIA.";
    summaryDoc.text(footerText, 15, 288);

    const summaryPdfBytes = summaryDoc.output('arraybuffer');
    const summaryPdf = await PDFDocument.load(summaryPdfBytes);
    const summaryPageCount = summaryPdf.getPageCount();
    for (let i = 0; i < summaryPageCount; i++) {
      const [page] = await mergedPdf.copyPages(summaryPdf, [i]);
      mergedPdf.addPage(page);
    }

    // ANEXAR ARQUIVOS
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Manifesto Modal */}
      {showManifesto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-brand-blue p-10 text-white relative">
              <button onClick={() => setShowManifesto(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
                <XCircle className="w-8 h-8" />
              </button>
              <Lightbulb className="w-16 h-16 text-brand-yellow mb-6" />
              <h2 className="text-3xl font-black uppercase tracking-tight">Manifesto DocFlow NP</h2>
              <p className="text-white/70 font-medium mt-2 italic text-sm">Criado no ecossistema da Lary.IA</p>
            </div>
            <div className="p-10 space-y-8">
              <section>
                <h3 className="text-xs font-black text-brand-blue uppercase tracking-widest mb-4">O que é a ferramenta?</h3>
                <p className="text-slate-600 leading-relaxed font-medium text-sm">
                  O DocFlow NP é um ecossistema de automação documental projetado para o Hospital Pequeno Príncipe. 
                  Sua missão é substituir processos manuais repetitivos por uma esteira de auditoria inteligente.
                </p>
              </section>
              <a 
                href="https://wa.me/5541997015424?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20a%20Doc%20Flow%20NP" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-black transition-all flex items-center justify-center gap-3 text-sm shadow-xl"
              >
                <MessageCircle className="w-5 h-5" /> FALAR COM DESENVOLVEDOR
              </a>
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-blue/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-brand-yellow">
            <div className="bg-brand-yellow p-8 text-brand-blue text-center">
              <AlertTriangle className="w-14 h-14 mx-auto mb-3" />
              <h2 className="text-2xl font-black uppercase">Falha de Compliance</h2>
              <p className="text-xs font-bold opacity-80 mt-1">Divergências detectadas pelo motor de IA DocFlow.</p>
            </div>
            <div className="p-8">
              <div className="space-y-3 mb-8">
                {validation.missingTypes.map(t => (
                  <div key={t} className="flex items-center gap-3 text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <XCircle className="w-4 h-4" /> Faltando documento: {t}
                  </div>
                ))}
                {validation.discrepancies.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {d}
                  </div>
                ))}
              </div>
              <div className="grid gap-3">
                <button onClick={finalizeProcess} className="w-full bg-brand-blue text-white font-black py-4 rounded-2xl hover:bg-opacity-90 transition-all shadow-lg text-sm">PROSSEGUIR COM RESSALVAS (_pc)</button>
                <button onClick={() => setShowWarningModal(false)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 text-sm">CANCELAR E AJUSTAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b-4 border-brand-yellow shadow-sm h-20 flex-shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter text-brand-blue">DOCFLOW <span className="text-brand-lightBlue">NP</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Gestão e Auditoria HPP</p>
            </div>
          </div>
          <button onClick={() => setShowManifesto(true)} className="w-12 h-12 bg-brand-yellow/10 hover:bg-brand-yellow/20 rounded-2xl flex items-center justify-center transition-all group border border-brand-yellow/20">
            <Lightbulb className="w-6 h-6 text-brand-blue group-hover:fill-brand-yellow transition-all" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 overflow-hidden">
        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 h-full pb-10">
          {step === 'upload' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-200 p-12 text-center group hover:border-brand-blue hover:bg-brand-blue/[0.02] transition-all relative cursor-pointer shadow-sm">
                <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                <div className="w-20 h-20 bg-brand-blue/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-brand-blue" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Upload de Documentos</h2>
                <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto text-xs leading-relaxed">Adicione seus arquivos para identificação imediata via Lary.IA.</p>
              </div>

              {files.length > 0 && (
                <div className="mt-8 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in duration-300">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-brand-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fila de Identificação ({files.length})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <button className="bg-slate-200 text-slate-600 px-5 py-3 rounded-full text-[9px] font-black hover:bg-slate-300 transition-all flex items-center gap-2">
                          <Plus className="w-4 h-4" /> ADICIONAR
                        </button>
                      </div>
                      <button 
                        onClick={startAutomation} 
                        disabled={files.some(f => f.status === 'processing' || f.status === 'pending')}
                        className="bg-brand-blue text-white px-8 py-3 rounded-full text-[9px] font-black hover:scale-105 transition-transform shadow-lg shadow-brand-blue/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {files.some(f => f.status === 'processing' || f.status === 'pending') ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4 text-brand-yellow" />
                        )} 
                        INICIAR CONFERÊNCIA
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {files.map((doc, idx) => (
                      <div key={doc.id} className={`p-5 flex items-center gap-5 group transition-colors ${doc.status === 'invalid' ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button disabled={idx === 0} onClick={() => moveFile(idx, 'up')} className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                          <button disabled={idx === files.length - 1} onClick={() => moveFile(idx, 'down')} className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${doc.status === 'invalid' ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 group-hover:text-brand-blue group-hover:bg-brand-blue/10'}`}>
                          {doc.status === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-slate-800 truncate mb-0.5">{doc.file.name}</div>
                          <div className="min-h-[20px] flex items-center gap-3">
                            {doc.status === 'processing' || doc.status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest italic animate-pulse">
                                  {doc.description?.includes('Quota') ? 'Sistema ocupado, aguardando...' : 'Identificando documento...'}
                                </span>
                                {doc.description?.includes('Quota') && <Clock className="w-3 h-3 text-brand-blue animate-bounce" />}
                              </div>
                            ) : doc.status === 'completed' ? (
                              <div className="text-[11px] font-bold text-brand-lightBlue uppercase tracking-tight flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {doc.description || doc.semanticType}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="text-[11px] font-black text-rose-600 uppercase tracking-tight flex items-center gap-1.5">
                                  <XCircle className="w-3 h-3" />
                                  DOCUMENTO NÃO IDENTIFICADO / INVÁLIDO
                                </div>
                                <button 
                                  onClick={() => processFileAnalysis(doc)}
                                  title="Tentar releitura do arquivo"
                                  className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-lg transition-colors shadow-sm border border-rose-200 group/btn"
                                >
                                  <RefreshCw className="w-3 h-3 group-hover/btn:rotate-180 transition-transform duration-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setFiles(prev => prev.filter(f => f.id !== doc.id))} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-brand-blue text-white">
                  <div className="flex items-center gap-3">
                    <FileSearch className="w-5 h-5 text-brand-yellow" />
                    <h3 className="font-black text-xs uppercase tracking-widest">Painel de Auditoria de Compliance</h3>
                  </div>
                  {isProcessing && <Loader2 className="w-5 h-5 animate-spin text-brand-yellow" />}
                </div>
                <div className="divide-y divide-slate-50">
                  {files.map((doc, idx) => (
                    <div key={doc.id} className="p-6 flex items-start gap-6 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-brand-yellow text-xs font-black shrink-0 shadow-lg">{idx + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-sm font-black text-slate-800">{doc.file.name}</div>
                          <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${doc.status === 'invalid' ? 'bg-rose-500 text-white' : 'bg-brand-blue text-white'}`}>
                            {doc.semanticType}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                           {doc.extractedData?.donorName && (
                             <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                               <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Doador/Contribuinte</p>
                               <p className="text-xs font-bold text-slate-700">{doc.extractedData.donorName}</p>
                             </div>
                           )}
                           {doc.extractedData?.value && (
                             <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                               <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Valor Auditado</p>
                               <p className="text-xs font-bold text-brand-blue">R$ {doc.extractedData.value.toFixed(2)}</p>
                             </div>
                           )}
                        </div>
                        <p className={`text-xs font-medium italic border-l-2 pl-3 ${doc.status === 'invalid' ? 'text-rose-500 border-rose-300' : 'text-slate-500 border-slate-200'}`}>
                          {doc.description || "Análise detalhada concluída."}
                        </p>
                      </div>
                      <div className="pt-1">
                        {doc.status === 'invalid' ? (
                          <div className="bg-rose-100 p-2 rounded-full"><XCircle className="w-5 h-5 text-rose-500" /></div>
                        ) : (
                          <div className="bg-emerald-100 p-2 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!isProcessing && (
                <div className="flex justify-center pt-4">
                  <button onClick={handleRequestUnification} className="px-16 py-6 rounded-3xl font-black text-sm shadow-2xl transition-all flex items-center gap-4 group bg-brand-blue text-white hover:bg-opacity-90 hover:scale-105">
                    UNIR DOCUMENTOS <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'finalized' && (
            <div className="bg-white rounded-[3.5rem] shadow-2xl border-4 border-emerald-100 p-16 text-center animate-in zoom-in-95 duration-700">
              <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Processo Finalizado!</h2>
              <div className="mt-4 space-y-2">
                <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">O arquivo unificado com selo de auditoria institucional foi gerado com sucesso.</p>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 inline-block text-left mt-6 shadow-sm">
                  <div className="mb-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase block tracking-widest">Protocolo</span>
                    <span className="font-mono font-black text-brand-blue text-lg">{protocol}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase block tracking-widest">Arquivo Final</span>
                    <span className="font-mono font-bold text-slate-700 text-sm break-all">{finalFileName}.pdf</span>
                  </div>
                </div>
              </div>
              <div className="mt-12"><button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black text-sm hover:bg-black transition-all shadow-lg">NOVO FLUXO</button></div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Todos os direitos reservados | Larysson Lara CNPJ 21.178.711/0001-20
          </p>
        </div>
      </footer>
    </div>
  );
}
