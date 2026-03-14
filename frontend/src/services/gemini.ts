
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

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
    // Check for both possible environment variables for the API key
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Chave API não configurada. Por favor, configure a chave no login.");
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
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
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `Você é um classificador de documentos para o Hospital Pequeno Príncipe.
          Identifique o tipo do documento.
          Retorne APENAS JSON no formato:
          {
            "category": "DARF | Comprovante | E-Mail | Outros",
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
    } catch (apiErr: any) {
      // Handle specific 403 error for better user feedback
      if (apiErr.message?.includes('403') || apiErr.status === 403) {
        throw new Error("Erro 403: Chave API inválida ou sem permissão. Tente reconfigurar a chave.");
      }
      throw apiErr;
    }
  });
}
