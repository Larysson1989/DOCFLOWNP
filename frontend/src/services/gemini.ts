
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function withFastRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

export async function analyzeDocument(base64Data: string, mimeType: string, fileName: string): Promise<{
  category: string;
  confidence: number;
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
            text: `Analise o arquivo: ${fileName}. Classifique o documento.`
          }
        ]
      },
      config: {
        systemInstruction: `Você é um classificador de documentos para o Hospital Pequeno Príncipe.
        Identifique o tipo do documento.
        Retorne APENAS JSON no formato:
        {
          "category": "DARF | Comprovante | Email | Outros",
          "confidence": 0-1
        }`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["category", "confidence"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta da API vazia");
    return JSON.parse(text);
  });
}
