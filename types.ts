export enum TransactionType {
  INCOME = 'Receita',
  EXPENSE = 'Despesa'
}

export enum FamilyMember {
  ME = 'Eu',
  PARTNER = 'Esposa',
  JOINT = 'Conjunto'
}

export interface Transaction {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  member: FamilyMember;
}

export interface BudgetItem {
  id: string;
  month: string; // YYYY-MM format
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  isRecurring?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}
