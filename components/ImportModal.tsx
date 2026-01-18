import React, { useState } from 'react';
import { parseBankStatement } from '../services/geminiService';
import { Transaction, TransactionType, FamilyMember } from '../types';
import { generateId } from '../utils';
import { X, Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
  existingTransactions: Transaction[];
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, existingTransactions }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember>(FamilyMember.JOINT);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        // Extrair texto de PDF
        const arrayBuffer = await file.arrayBuffer();
        
        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extrair texto de todas as páginas
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        setText(fullText);
      } else {
        // Ler como texto (CSV, TXT)
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          setText(content);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError('Erro ao processar o ficheiro. Tenta novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!text.trim()) {
      setError("Por favor, cole o texto do extrato ou carregue um ficheiro.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const extractedData = await parseBankStatement(text);
      
      let duplicatesCount = 0;
      const newTransactions: Transaction[] = [];

      extractedData.forEach(t => {
        // Deduplication Logic:
        // Check if we already have a transaction with same Date, Amount, and Type
        // We do not check description strictly because manual entry description might differ from bank description
        const isDuplicate = existingTransactions.some(existing => 
            existing.date === t.date && 
            Math.abs(existing.amount - t.amount) < 0.01 && // Float comparison safety
            existing.type === t.type
        );

        if (isDuplicate) {
            duplicatesCount++;
        } else {
            newTransactions.push({
                ...t,
                id: generateId(),
                member: selectedMember
            });
        }
      });

      if (newTransactions.length === 0 && duplicatesCount > 0) {
          setError(`Todas as ${duplicatesCount} transações detetadas já existem no sistema.`);
      } else if (newTransactions.length === 0) {
          setError("Não foram encontradas transações válidas no texto.");
      } else {
          onImport(newTransactions);
          const msg = duplicatesCount > 0 
            ? `${newTransactions.length} transações importadas com sucesso (${duplicatesCount} duplicadas ignoradas).`
            : `${newTransactions.length} transações importadas com sucesso.`;
          
          setSuccessMsg(msg);
          
          // Close after short delay to show success
          setTimeout(() => {
              onClose();
              setText('');
              setSuccessMsg(null);
          }, 2000);
      }

    } catch (err) {
      setError("Erro ao processar o extrato. A IA não conseguiu identificar os dados. Tente colar um formato mais limpo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            Importar Extrato Bancário
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-600">
            A nossa IA consegue ler extratos de vários bancos e <strong>ignora automaticamente transações duplicadas</strong> (mesma data e valor).
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">A quem pertence este extrato?</label>
            <div className="flex gap-4">
              {Object.values(FamilyMember).map((member) => (
                <label key={member} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="member"
                    value={member}
                    checked={selectedMember === member}
                    onChange={(e) => setSelectedMember(e.target.value as FamilyMember)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">{member}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-white hover:border-emerald-300 transition-colors">
             <label className="flex flex-col items-center justify-center cursor-pointer">
                <FileText className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Carregar ficheiro (.txt, .csv, .pdf)</span>
                <input type="file" accept=".txt,.csv,.pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
             </label>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ou cole aqui o texto do seu extrato bancário..."
              className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-xs"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
               <AlertCircle className="w-4 h-4" />
               {error}
            </div>
          )}
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4" />
               {successMsg}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleProcess}
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'A processar...' : 'Processar Extrato'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;