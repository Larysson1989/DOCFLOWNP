
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function withFastRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || (error as any)?.response?.status;
      if (status === 429 || status === 500) {
        await new Promise(resolve => setTimeout(resolve, 800));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function analyzeDocument(base64Data: string, mimeType: string, fileName: string): Promise<{
  document_type: 'DARF' | 'COMPROVANTE' | 'EMAIL' | 'DESCONHECIDO';
  status: 'validated' | 'invalid';
}> {
  return withFastRetry(async () => {
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
            text: `Analise o arquivo: ${fileName}. Classifique apenas o tipo e valide se é um documento legível e autêntico.`
          }
        ]
      },
      config: {
        systemInstruction: `Você é um classificador de documentos para o Hospital Pequeno Príncipe.
        Identifique o tipo do documento e valide se ele parece completo.
        TIPOS: DARF, COMPROVANTE, EMAIL ou DESCONHECIDO.
        STATUS: validated (se legível e completo) ou invalid.
        Responda APENAS JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            document_type: {
              type: Type.STRING,
              enum: ['DARF', 'COMPROVANTE', 'EMAIL', 'DESCONHECIDO']
            },
            status: {
              type: Type.STRING,
              enum: ['validated', 'invalid']
            }
          },
          required: ["document_type", "status"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta da API vazia");
    return JSON.parse(text);
  });
}
