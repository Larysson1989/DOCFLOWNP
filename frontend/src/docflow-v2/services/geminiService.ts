// ─── DOC.FLOW v2 — Gemini Service ────────────────────────────────────────────
// ⚠️ Reutiliza a chave GEMINI/VITE_GEMINI_API_KEY já configurada no projeto
// NÃO cria nova chave. Usa modelo configurado em DOCFLOW_V2_GEMINI_MODEL.

import { GoogleGenAI } from '@google/genai';

const DOCFLOW_V2_MODEL =
  (import.meta as any).env?.DOCFLOW_V2_GEMINI_MODEL ||
  'gemini-1.5-pro';

const DOCFLOW_V2_MAX_TOKENS =
  parseInt((import.meta as any).env?.DOCFLOW_V2_MAX_TOKENS || '8192');

function getApiKey(): string {
  const key =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_API_KEY ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.API_KEY);

  if (!key) {
    throw new Error(
      '[DOC.FLOW v2] Chave Gemini não encontrada. Configure VITE_GEMINI_API_KEY ou equivalente no .env'
    );
  }
  return key;
}

function createClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getApiKey() });
}

/**
 * resumirPDF — Gera resumo executivo de um PDF via Gemini Vision
 * @param base64PDF  Conteúdo do PDF em base64
 * @param contexto   Contexto adicional para guiar o resumo
 */
export async function resumirPDF(
  base64PDF: string,
  contexto: string = ''
): Promise<string> {
  const ai = createClient();

  const prompt = contexto
    ? `Contexto adicional: ${contexto}\n\nResuma o conteúdo deste PDF de forma clara e objetiva.`
    : 'Crie um resumo executivo deste PDF. Destaque os pontos principais, conclusões e informações relevantes. Use markdown para organizar a resposta.';

  const response = await ai.models.generateContent({
    model: DOCFLOW_V2_MODEL,
    contents: {
      parts: [
        { inlineData: { data: base64PDF, mimeType: 'application/pdf' } },
        { text: prompt }
      ]
    },
    config: {
      maxOutputTokens: DOCFLOW_V2_MAX_TOKENS,
      systemInstruction:
        'Você é um especialista em análise e síntese de documentos. Produza resumos precisos, bem estruturados e úteis em português brasileiro.'
    }
  });

  const text = response.text;
  if (!text) throw new Error('[DOC.FLOW v2] Resumo: resposta vazia da API Gemini.');
  return text;
}

/**
 * traduzirPDF — Traduz o conteúdo de um PDF para o idioma destino e retorna Blob
 * @param base64PDF      Conteúdo do PDF em base64
 * @param contexto       Contexto adicional
 * @param idiomaDestino  Ex: 'inglês', 'espanhol', 'francês'
 */
export async function traduzirPDF(
  base64PDF: string,
  contexto: string = '',
  idiomaDestino: string = 'inglês'
): Promise<Blob> {
  const ai = createClient();

  const prompt = [
    contexto ? `Contexto: ${contexto}` : '',
    `Traduza TODO o conteúdo deste PDF para ${idiomaDestino}.`,
    'Preserve a estrutura, formatação e hierarquia do texto original.',
    'Retorne APENAS o texto traduzido, sem comentários ou observações adicionais.'
  ]
    .filter(Boolean)
    .join('\n');

  const response = await ai.models.generateContent({
    model: DOCFLOW_V2_MODEL,
    contents: {
      parts: [
        { inlineData: { data: base64PDF, mimeType: 'application/pdf' } },
        { text: prompt }
      ]
    },
    config: {
      maxOutputTokens: DOCFLOW_V2_MAX_TOKENS,
      systemInstruction: `Você é um tradutor profissional especializado em ${idiomaDestino}. Traduza com precisão e naturalidade.`
    }
  });

  const text = response.text;
  if (!text) throw new Error('[DOC.FLOW v2] Tradução: resposta vazia da API Gemini.');

  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

/**
 * extrairInformacoes — Extrai dados estruturados de um PDF
 * @param base64PDF  Conteúdo do PDF em base64
 * @param contexto   Contexto / instrução para direcionar a extração
 */
export async function extrairInformacoes(
  base64PDF: string,
  contexto: string = ''
): Promise<string> {
  const ai = createClient();

  const prompt = contexto
    ? `Instruções específicas: ${contexto}\n\nExtraia as informações relevantes deste documento.`
    : [
        'Extraia e organize todas as informações relevantes deste documento:',
        '- Dados de identificação (nomes, CPF/CNPJ, datas)',
        '- Valores monetários e financeiros',
        '- Prazos e vencimentos',
        '- Referências e números de documento',
        '- Itens de ação ou pendências',
        'Retorne as informações em formato JSON estruturado.'
      ].join('\n');

  const response = await ai.models.generateContent({
    model: DOCFLOW_V2_MODEL,
    contents: {
      parts: [
        { inlineData: { data: base64PDF, mimeType: 'application/pdf' } },
        { text: prompt }
      ]
    },
    config: {
      maxOutputTokens: DOCFLOW_V2_MAX_TOKENS,
      systemInstruction:
        'Você é um especialista em extração de dados de documentos. Identifique e estruture as informações com máxima precisão.'
    }
  });

  const text = response.text;
  if (!text) throw new Error('[DOC.FLOW v2] Extração: resposta vazia da API Gemini.');
  return text;
}
