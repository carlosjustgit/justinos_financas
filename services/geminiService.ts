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

// Parse Revolut structured statement (direct column extraction)
const parseRevolutStatement = (text: string): Omit<Transaction, 'id' | 'member'>[] | null => {
  // Check if it's a Revolut statement
  if (!text.includes('Revolut') || !text.includes('Dinheiro retirado') || !text.includes('Dinheiro recebido')) {
    return null; // Not a Revolut statement
  }

  console.log('🎯 Detected Revolut statement - using structured parser');

  const transactions: Omit<Transaction, 'id' | 'member'>[] = [];
  const lines = text.split('\n');
  
  let isMainAccount = false;
  let skipSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect section starts
    if (line.includes('Operações da conta de') && !line.includes('Operações da conta de 1')) {
      // Subconta (ex: Aysha) - skip
      skipSection = true;
      console.log('⏭️ Skipping subconta:', line);
      continue;
    }
    
    if (line.includes('Operações da conta') && !line.includes('Aysha') && !line.includes('Cofres')) {
      // Main account
      isMainAccount = true;
      skipSection = false;
      console.log('✅ Entering main account section');
      continue;
    }

    if (line.includes('Cofres Pessoais') || line.includes('Depósito')) {
      skipSection = true;
      console.log('⏭️ Skipping:', line);
      continue;
    }

    // Skip if in wrong section
    if (skipSection || !isMainAccount) continue;

    // Match date pattern (DD/MM/YYYY)
    const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const [day, month, year] = date.split('/');
    const isoDate = `${year}-${month}-${day}`;

    // Try to find description and amounts in the same line or next lines
    let description = '';
    let withdrawn = 0;
    let received = 0;

    // Look for description (everything between date and amounts)
    const afterDate = line.substring(dateMatch[0].length).trim();
    
    // Extract amounts (€XXX.XX format)
    const amountMatches = afterDate.match(/€([\d,]+\.?\d*)/g);
    
    if (amountMatches && amountMatches.length > 0) {
      // Parse amounts
      const amounts = amountMatches.map(a => parseFloat(a.replace('€', '').replace(',', '')));
      
      // Determine description (text before first amount)
      const firstAmountIndex = afterDate.indexOf('€');
      description = afterDate.substring(0, firstAmountIndex).trim();
      
      // Revolut format: last number is always the balance, before that is withdrawn or received
      if (amounts.length >= 2) {
        // Check context to determine if it's withdrawn or received
        const amountIndex = afterDate.indexOf(amountMatches[0]);
        const beforeAmount = afterDate.substring(0, amountIndex).toLowerCase();
        
        // If there are multiple amounts, check which column it belongs to
        if (amounts.length === 2) {
          // Most likely: amount + balance
          // Need to check if it's in withdrawn or received column based on position/context
          const fullLine = lines.slice(Math.max(0, i - 2), i + 3).join(' ');
          
          if (fullLine.includes('Para:') || fullLine.includes('Cartão:') || description.toLowerCase().startsWith('to ')) {
            withdrawn = amounts[0];
          } else if (fullLine.includes('De:') || fullLine.includes('Referência: From') || description.toLowerCase().includes('transferência de') || description.toLowerCase().includes('carregamento')) {
            received = amounts[0];
          } else {
            // Default: if description suggests expense
            if (description.toLowerCase().startsWith('to ') || description.toLowerCase().includes('pagamento')) {
              withdrawn = amounts[0];
            } else {
              received = amounts[0];
            }
          }
        } else if (amounts.length === 3) {
          // Likely: withdrawn + received + balance
          withdrawn = amounts[0];
          received = amounts[1];
        }
      }
    } else {
      // Description might span multiple lines
      description = afterDate;
      
      // Look ahead for amounts in next lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        const nextAmounts = nextLine.match(/€([\d,]+\.?\d*)/g);
        
        if (nextAmounts) {
          const amounts = nextAmounts.map(a => parseFloat(a.replace('€', '').replace(',', '')));
          if (amounts.length >= 2) {
            // Determine based on context
            if (description.toLowerCase().startsWith('to ') || nextLine.toLowerCase().includes('para:')) {
              withdrawn = amounts[0];
            } else {
              received = amounts[0];
            }
          }
          break;
        }
        
        // Append to description if no amounts found yet
        if (!nextAmounts && nextLine && !nextLine.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          description += ' ' + nextLine;
        }
      }
    }

    // Clean description
    description = description
      .replace(/Para:.*Cartão:.*$/i, '')
      .replace(/Referência:.*$/i, '')
      .replace(/De:.*$/i, '')
      .trim();

    if (!description || (withdrawn === 0 && received === 0)) continue;

    // Determine type and category
    let type: TransactionType;
    let category = 'Outros';
    const amount = withdrawn > 0 ? withdrawn : received;

    // Investment: Fundos Monetários
    if (description.includes('Fundos Monetários')) {
      type = TransactionType.INVESTMENT;
      category = 'Fundos';
    }
    // Expense: withdrawn column
    else if (withdrawn > 0) {
      type = TransactionType.EXPENSE;
      
      // Categorize
      if (description.toLowerCase().includes('supermercado') || description.includes('Pingo Doce') || description.includes('Continente') || description.includes('Lidl') || description.includes('Auchan')) {
        category = 'Supermercado';
      } else if (description.includes('Uber') || description.includes('Restaurante') || description.includes('Bar ')) {
        category = 'Restaurantes';
      } else if (description.includes('Google') || description.includes('OpenAI') || description.includes('Netflix') || description.includes('Stripe')) {
        category = 'Serviços';
      } else if (description.includes('Leroy Merlin') || description.includes('Klarna')) {
        category = 'Casa';
      } else if (description.includes('Amazon') || description.includes('Etsy') || description.includes('Pandora')) {
        category = 'Lazer';
      } else if (description.toLowerCase().includes('transferência') || description.startsWith('To ')) {
        category = 'Transferência';
      } else if (description.includes('Levantamento') || description.includes('numerário')) {
        category = 'Levantamento';
      } else if (description.includes('Comissão') || description.includes('taxa')) {
        category = 'Taxas Bancárias';
      }
    }
    // Income: received column
    else if (received > 0) {
      type = TransactionType.INCOME;
      category = 'Transferência';
      
      if (description.toLowerCase().includes('salário') || description.toLowerCase().includes('ordenado')) {
        category = 'Salário';
      }
    } else {
      continue;
    }

    transactions.push({
      date: isoDate,
      description: description.substring(0, 100), // Limit length
      amount,
      type,
      category
    });

    console.log(`✅ ${isoDate} | ${description.substring(0, 30)} | ${type} | €${amount}`);
  }

  console.log(`📊 Revolut parser extracted ${transactions.length} transactions`);
  return transactions.length > 0 ? transactions : null;
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
  // Try Revolut structured parser first
  const revolutResult = parseRevolutStatement(text);
  if (revolutResult) {
    console.log('✅ Used Revolut structured parser');
    return revolutResult;
  }

  // Fallback to AI parser for other banks
  console.log('🤖 Using AI parser for non-Revolut statement');
  
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
        type: { 
          type: Type.STRING, 
          enum: [TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.SAVING, TransactionType.INVESTMENT],
          description: "Income for salary/credits, Expense for normal spending, Saving for transfers to savings accounts, Investment for stock/crypto purchases"
        },
        category: { 
          type: Type.STRING, 
          description: "Infer the most specific category based on description. Common categories: Habitação, Supermercado, Restaurantes, Transporte, Saúde, Lazer, Educação, Serviços (Água/Luz/Net), Fundo Emergência, Férias, Casa, Ações, Fundos, Crypto, Salário. Use custom category names when transaction is very specific (e.g., 'Netflix', 'Ginásio', 'Dentista')." 
        }
      },
      required: ["date", "description", "amount", "type", "category"]
    }
  };

  const prompt = `
    Analisa o seguinte extrato bancário (texto não estruturado) e extrai as transações para JSON.
    O contexto é Portugal.
    Hoje é ${today}. Se o ano não estiver explícito, assume o ano corrente ou o mais provável com base na data de hoje.
    
    ⚠️ ATENÇÃO - EXTRATOS REVOLUT COM MÚLTIPLAS CONTAS:
    Os extratos Revolut frequentemente incluem VÁRIAS contas na mesma página:
    - "Operações da conta" (conta corrente principal)
    - "Operações da conta de [NOME]" (subcontas de outros membros, ex: Aysha)
    - "Depósito" ou "Fundos Monetários Flexíveis" (investimentos automáticos)
    - "Cofres Pessoais e de Grupo"
    
    REGRAS CRÍTICAS:
    1. IGNORA COMPLETAMENTE transações de subcontas que NÃO sejam do titular principal:
       - Se vires "Operações da conta de Aysha" → IGNORA essas linhas
       - Se vires "Cofres Pessoais" → IGNORA
       - IMPORTA APENAS transações da secção "Operações da conta" SEM nome adicional
    
    2. MOVIMENTOS de INVESTIMENTOS (NÃO ignores):
       - "To Fundos Monetários Flexíveis" → INVESTIMENTO (aplicações em fundos)
       - "Carteira de pré-financiamento para carregamento no cofre" → IGNORA (movimentos técnicos)
       - "From Fundos" (retornos de fundos) → INVESTIMENTO
    
    3. Para "type" (Receita vs Despesa) - REGRAS COM CONTEXTO:
       
       DESPESA (dinheiro que SAI):
       - "To Jose Carlos...", "To [outro nome pessoa]", "Transferência para" → DESPESA
       - "Transferência internacional para" → DESPESA
       - Compras com cartão (Uber, Netflix, Continente, Wallison, etc) → DESPESA
       - Pagamentos, taxas, levantamentos → DESPESA
       
       RECEITA (dinheiro que ENTRA):
       - "Transferência de utilizador Revolut" → RECEITA
       - "Carregamento de [nome]" → RECEITA
       - "Sent from N26" ou de outros bancos → RECEITA
       - Salário, Ordenado, Vencimento → RECEITA
       
       ATENÇÃO - "To EUR Personal" ou "To EUR Pro" (subcontas Revolut):
       - Se o SALDO da linha AUMENTA ou está na coluna "recebido" → RECEITA (transferência da subconta para principal)
       - Se o SALDO da linha DIMINUI ou está na coluna "retirado" → DESPESA (transferência da principal para subconta)
       - Analisa o contexto dos valores e saldos para decidir corretamente!
       
       INVESTIMENTO (aplicações financeiras):
       - "To Fundos Monetários Flexíveis" → INVESTIMENTO
       - "Degiro", "Trading212", "Coinbase" → INVESTIMENTO
    
    4. CATEGORIAS específicas:
       - Supermercados: Continente, Pingo Doce, Lidl → "Supermercado"
       - Combustível: Galp, Repsol → "Transporte"
       - Serviços conhecidos: Netflix, Spotify, OpenAI → usar o nome exato
    
    5. NÃO IGNORES TRANSAÇÕES PEQUENAS:
       - Transações de €0.70, €0.80, €0.90 são VÁLIDAS (ex: máquinas de vending)
       - Transações de €5-15 são VÁLIDAS (ex: serviços, pequenas compras)
       - Importa TODAS as transações, independentemente do valor!
    
    IMPORTANTE: Extrai APENAS transações da conta corrente PRINCIPAL do titular, ignorando subcontas e movimentos internos!
    
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