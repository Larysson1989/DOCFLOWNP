
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

let customApiKey: string | null = null;

export function setCustomApiKey(key: string) {
  customApiKey = key;
}

export async function analyzeDocument(base64Data: string, mimeType: string, fileName: string): Promise<{
  category: string;
  confidence: number;
  suggestedName: string;
  data?: {
    cpfCnpj?: string;
    nome?: string;
    periodoApuracao?: string;
    vencimento?: string;
    numeroDocumento?: string;
    valorTotal?: string;
    codigoReceita?: string;
  };
}> {
  return withFastRetry(async () => {
    // Check for both possible environment variables for the API key or custom key
    const apiKey = customApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Chave API não configurada. Por favor, configure a chave no login.");
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
      console.log(`Iniciando análise do documento: ${fileName}`);
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
              text: `Analise o arquivo: ${fileName}. Identifique o tipo do documento e extraia um nome amigável para exibição.`
            }
          ]
        },
        config: {
          systemInstruction: `Você é um especialista em análise de documentos para o Hospital Pequeno Príncipe.
          Sua tarefa é classificar o documento e sugerir um nome de exibição amigável baseado no conteúdo (ex: Nome da Pessoa, Tipo de Documento + Data, etc).

          REGRAS PARA suggestedName:
          - Se for DARF: Use o nome do contribuinte em MAIÚSCULAS.
          - Se for Comprovante: Use "Comprovante - [Nome do Favorecido/Empresa]".
          - Se for E-Mail: Use o assunto do e-mail ou "E-mail de [Remetente]".
          - Para outros: Use um título curto que descreva o conteúdo.
          - Se não conseguir identificar nada relevante, use o nome do arquivo original sem a extensão.

          Se o documento for um DARF, extraia também os dados estruturados.

          Retorne APENAS JSON no formato:
          {
            "category": "DARF | Comprovante | E-Mail | Outros",
            "confidence": 0-1,
            "suggestedName": "string",
            "data": { // Opcional, apenas se for DARF
              "cpfCnpj": "string",
              "nome": "string",
              "periodoApuracao": "string",
              "vencimento": "string",
              "numeroDocumento": "string",
              "valorTotal": "string",
              "codigoReceita": "string"
            }
          }`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              suggestedName: { type: Type.STRING },
              data: {
                type: Type.OBJECT,
                properties: {
                  cpfCnpj: { type: Type.STRING },
                  nome: { type: Type.STRING },
                  periodoApuracao: { type: Type.STRING },
                  vencimento: { type: Type.STRING },
                  numeroDocumento: { type: Type.STRING },
                  valorTotal: { type: Type.STRING },
                  codigoReceita: { type: Type.STRING }
                }
              }
            },
            required: ["category", "confidence", "suggestedName"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Resposta da API vazia");
      const parsed = JSON.parse(text);
      console.log(`Análise concluída para ${fileName}:`, parsed);
      return parsed;
    } catch (apiErr: any) {
      // Handle specific 403 error for better user feedback
      if (apiErr.message?.includes('403') || apiErr.status === 403) {
        throw new Error("Erro 403: Chave API inválida ou sem permissão. Tente reconfigurar a chave.");
      }
      throw apiErr;
    }
  });
}
