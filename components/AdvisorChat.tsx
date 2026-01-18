import React, { useState, useRef, useEffect } from 'react';
import { Transaction, ChatMessage, Goal } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { generateId } from '../utils';
import { Send, Bot, User, Sparkles, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AdvisorChatProps {
  transactions: Transaction[];
  goals?: Goal[];
}

const AdvisorChat: React.FC<AdvisorChatProps> = ({ transactions, goals = [] }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '👋 Olá! Sou o **Gemini**, o teu consultor financeiro pessoal inteligente.\n\nPosso ajudar-te com:\n- 💰 Análise dos teus gastos\n- 🎯 Estratégias para atingir as tuas metas\n- 📊 Sugestões de poupança\n- 📈 Conselhos de investimento\n\nO que gostarias de saber hoje?',
      timestamp: new Date()
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await getFinancialAdvice(history, transactions, userMsg.text, goals);

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: responseText || "Desculpa, não consegui processar o pedido. Tenta novamente.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: "Ocorreu um erro ao contactar o consultor. Verifica a tua ligação ou chave API.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Suggested questions based on context
  const suggestedQuestions = [
    "Onde posso cortar gastos este mês?",
    "Como posso poupar €500/mês?",
    "Devo investir ou poupar primeiro?",
    goals.length > 0 ? "Vou conseguir atingir as minhas metas?" : "Que metas devo definir?",
    "Analisa os meus padrões de gasto"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-full">
            <Sparkles className="w-5 h-5 text-yellow-300" />
        </div>
        <div>
          <h3 className="font-bold">Consultor Financeiro Gemini</h3>
          <p className="text-xs text-emerald-100">Especialista em finanças pessoais para Portugal</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'model' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {msg.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 rounded-bl-none border border-gray-100'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-sm prose-emerald max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-medium text-gray-600">Perguntas sugeridas:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo como 'Como posso reduzir as despesas de supermercado?'..."
            className="w-full resize-none rounded-xl border border-gray-200 p-3 pr-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm max-h-32 shadow-sm outline-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">
          A IA pode cometer erros. Verifique sempre informações importantes.
        </p>
      </div>
    </div>
  );
};

export default AdvisorChat;