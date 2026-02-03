
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.message?.includes('quota') || error?.status === 429;
      
      if (isQuotaError && i < maxRetries - 1) {
        // Backoff exponencial: 2s, 4s, 8s, 16s...
        const waitTime = Math.pow(2, i + 1) * 1000 + Math.random() * 1000;
        console.warn(`Quota atingida. Tentativa ${i + 1} de ${maxRetries}. Aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function analyzeDocument(base64Data: string, mimeType: string): Promise<{
  semanticType: 'DARF' | 'COMPROVANTE' | 'FRASE_PADRONIZADA' | 'DESCONHECIDO';
  description: string;
  extractedData: {
    donorName?: string;
    value?: number;
    date?: string;
    identifier?: string;
  };
  confidence: number;
}> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: `Aja como um auditor de compliance rigoroso do Hospital Pequeno Príncipe. 
            Analise este documento e forneça uma classificação detalhada e precisa.
            
            Para o campo 'description', use nomes institucionais como:
            - "Documento de Arrecadação de Receitas Federais" (se for DARF puro)
            - "Demonstrativo de Débitos da Declaração - Pagamentos" (se for o demonstrativo detalhado)
            - "Comprovante de Arrecadação" (se for o ticket de banco do DARF)
            - "Comprovante de Pagamento Bancário / PIX" (se for comprovante de transferência simples)
            - "Frase Padronizada / Anuência Institucional" (se for texto/declaração)

            Extraia também:
            1. CLASSIFICAÇÃO SEMÂNTICA: DARF, COMPROVANTE, FRASE_PADRONIZADA ou DESCONHECIDO.
            2. NOME DO DOADOR/CONTRIBUINTE.
            3. VALOR (numérico).
            4. DATA.
            5. CPF/CNPJ.

            Responda EXCLUSIVAMENTE em formato JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            semanticType: {
              type: Type.STRING,
              enum: ['DARF', 'COMPROVANTE', 'FRASE_PADRONIZADA', 'DESCONHECIDO']
            },
            description: { type: Type.STRING, description: "Nome institucional específico do documento." },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                donorName: { type: Type.STRING },
                value: { type: Type.NUMBER },
                date: { type: Type.STRING },
                identifier: { type: Type.STRING }
              }
            },
            confidence: { type: Type.NUMBER }
          },
          required: ["semanticType", "description", "extractedData", "confidence"]
        }
      }
    });

    const jsonStr = (response.text || '{}').trim();
    return JSON.parse(jsonStr);
  });
}
