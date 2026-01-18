import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Transaction, TransactionType, FamilyMember } from "../types";

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY;
};

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // In production, this should block. In dev/preview, we might want to warn.
    // However, the instructions state strictly to use process.env.API_KEY.
    // If missing, the SDK will likely fail or we throw here.
    console.warn("API Key is missing from process.env.API_KEY");
    // We try to return client anyway, it might fail on request if key is mandatory for that specific call
    // But usually constructor requires it.
    throw new Error("API Key not found. Please ensure process.env.API_KEY is set.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean JSON markdown
const cleanJson = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  // Remove markdown code blocks if present
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return clean;
};

// Convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Parse Receipt Image
export const parseReceiptImage = async (file: File): Promise<Partial<Transaction>> => {
  const ai = getClient();
  const base64Data = await fileToGenerativePart(file);

  const prompt = `
    Analisa esta imagem de um recibo/fatura em Portugal.
    Extrai os seguintes dados para JSON:
    - description: Nome do estabelecimento ou descrição breve.
    - amount: O valor total pago (TOTAL). Procura o valor final.
    - date: A data da transação (formato YYYY-MM-DD). Se não encontrares o ano, assume o ano corrente.
    - category: A categoria mais provável (Ex: Supermercado, Restaurantes, Saúde, Transporte, Lazer, etc).
    - type: Normalmente é 'Despesa'.

    Responde APENAS com o JSON.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      date: { type: Type.STRING },
      category: { type: Type.STRING },
      type: { type: Type.STRING, enum: [TransactionType.EXPENSE, TransactionType.INCOME] }
    },
    required: ["description", "amount", "category"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", // Using vision capable model
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const jsonString = cleanJson(response.text || "{}");
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw new Error("Não foi possível ler o recibo. Tenta uma imagem mais nítida.");
  }
};

// Prompt to parse raw bank statement text
export const parseBankStatement = async (text: string): Promise<Omit<Transaction, 'id' | 'member'>[]> => {
  const ai = getClient();
  
  const today = new Date().toISOString().split('T')[0];

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
        description: { type: Type.STRING },
        amount: { type: Type.NUMBER, description: "Absolute numeric value of the transaction" },
        type: { type: Type.STRING, enum: [TransactionType.INCOME, TransactionType.EXPENSE] },
        category: { type: Type.STRING, description: "Infer the category based on description (e.g., Supermercado, Transporte, Habitação)" }
      },
      required: ["date", "description", "amount", "type", "category"]
    }
  };

  const prompt = `
    Analisa o seguinte extrato bancário (texto não estruturado) e extrai as transações para JSON.
    O contexto é Portugal.
    Hoje é ${today}. Se o ano não estiver explícito, assume o ano corrente ou o mais provável com base na data de hoje.
    Ignora cabeçalhos, rodapés ou saldos acumulados. Extrai apenas movimentos individuais.
    
    TEXTO DO EXTRATO:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a precise data extraction assistant for financial documents."
      }
    });

    const jsonString = cleanJson(response.text || "[]");
    const parsedData = JSON.parse(jsonString);
    return parsedData;
  } catch (error) {
    console.error("Error parsing statement with Gemini:", error);
    throw new Error("Falha ao processar o extrato bancário. A IA não conseguiu interpretar os dados.");
  }
};

// Financial Advisor Chat with Goals context
export const getFinancialAdvice = async (
  currentHistory: { role: 'user' | 'model'; text: string }[],
  transactions: Transaction[],
  userMessage: string,
  goals: any[] = []
) => {
  const ai = getClient();
  
  // Create a summary of the financial situation
  const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
  const savings = transactions.filter(t => t.type === 'Poupança').reduce((acc, t) => acc + t.amount, 0);
  const investments = transactions.filter(t => t.type === 'Investimento').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense - savings - investments;
  const savingsRate = income > 0 ? ((savings + investments) / income * 100).toFixed(1) : '0';
  
  // Recent transactions context
  const recentTransactions = transactions
    .slice(0, 50)
    .map(t => `${t.date}: ${t.description} (${t.amount}€) - ${t.type} - ${t.category} [${t.member}]`)
    .join('\n');

  // Goals context
  const goalsContext = goals.length > 0 
    ? `\nMETAS FINANCEIRAS:\n${goals.map(g => 
        `- ${g.name}: ${g.currentAmount}€ / ${g.targetAmount}€ (${((g.currentAmount/g.targetAmount)*100).toFixed(0)}%) - Prazo: ${g.deadline}`
      ).join('\n')}`
    : '\nAinda não têm metas definidas.';

  const systemInstruction = `
    És um consultor financeiro pessoal experiente e empático, especializado no mercado português.
    O teu nome é "Gemini Advisor".
    O teu objetivo é ajudar a família a gerir o orçamento, poupar dinheiro, atingir metas e investir com sabedoria.
    
    DADOS FINANCEIROS ATUAIS (MÊS ATUAL):
    💰 Receitas: ${income.toFixed(2)}€
    💸 Despesas: ${expense.toFixed(2)}€
    🎯 Poupanças: ${savings.toFixed(2)}€
    📈 Investimentos: ${investments.toFixed(2)}€
    💵 Disponível: ${balance.toFixed(2)}€
    📊 Taxa de Poupança: ${savingsRate}%
    ${goalsContext}
    
    TRANSAÇÕES RECENTES (últimas 50):
    ${recentTransactions}
    
    DIRETRIZES:
    1. Responde sempre em Português de Portugal, usando markdown para formatação.
    2. Sê conciso, prático e motivador.
    3. Usa os dados fornecidos para dar conselhos específicos e personalizados.
    4. Analisa padrões: gastos recorrentes, categorias com mais despesas, oportunidades de poupança.
    5. Se houver metas, analisa se estão no caminho certo e sugere ajustes.
    6. Para metas não definidas, sugere criar (ex: fundo emergência = 6 meses de despesas).
    7. Usa emojis para tornar as respostas mais visuais e amigáveis.
    8. Se te perguntarem sobre impostos/leis, refere que devem consultar um contabilista, mas dá orientações gerais.
    9. Se sugeres algo, explica PORQUÊ e COMO implementar.
    10. Celebra conquistas e encoraja quando necessário!
  `;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
    },
    history: currentHistory.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }))
  });

  const response = await chat.sendMessage({ message: userMessage });
  return response.text;
};