import { GoogleGenAI, Type } from "@google/genai";

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
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
      || (import.meta as any).env?.VITE_API_KEY
      || process.env.API_KEY
      || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Chave API não configurada no ambiente.");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      console.log(`Iniciando análise do documento: ${fileName}`);

      const response = await ai.models.generateContent({
        // ✅ modelo estável com disponibilidade geral
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: `Analise este documento: ${fileName}. Identifique o tipo e extraia todos os dados visíveis.`
            }
          ]
        },
        config: {
          systemInstruction: `Você é um especialista em análise de documentos fiscais e financeiros do Hospital Pequeno Príncipe.
Classifique o documento e extraia as informações com máxima precisão.

CATEGORIAS POSSÍVEIS (use exatamente uma):
- "DARF" → Documento de Arrecadação de Receitas Federais
- "Comprovante" → Comprovante de pagamento ou transferência bancária
- "E-Mail" → Mensagem de e-mail impressa ou capturada
- "Outros" → Qualquer outro tipo de documento

REGRAS PARA suggestedName:
- Se for DARF: use APENAS o nome do contribuinte em MAIÚSCULAS (ex: "JESSICA COSTA")
- Se for Comprovante: use "Comprovante - [Nome do Favorecido]"
- Se for E-Mail: use o assunto do e-mail ou "E-mail de [Remetente]"
- Para Outros: use um título curto que descreva o conteúdo

REGRAS CRÍTICAS PARA DARF — siga obrigatoriamente:
- O campo data.nome DEVE ser preenchido com o nome exato que aparece no campo "Nome" ou "Contribuinte" do DARF
- O campo data.cpfCnpj DEVE ser preenchido com o CPF ou CNPJ visível no documento
- O campo data.vencimento DEVE ser preenchido com a data de vencimento
- O campo data.valorTotal DEVE ser preenchido com o valor total a pagar
- O campo data.periodoApuracao DEVE ser preenchido com o período de apuração
- O campo data.codigoReceita DEVE ser preenchido com o código da receita
- NUNCA deixe data.nome vazio quando o documento for DARF e o campo Nome estiver visível no documento
- Se não conseguir ler algum campo, preencha com "Não identificado" ao invés de deixar vazio

Retorne APENAS JSON válido no formato especificado.`,
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
      if (apiErr.message?.includes('403') || apiErr.status === 403) {
        throw new Error("Erro 403: Chave API inválida ou sem permissão. Tente reconfigurar a chave.");
      }
      throw apiErr;
    }
  });
}
