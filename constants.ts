import { Transaction, TransactionType, FamilyMember } from './types';

export const CATEGORIES = [
  'Habitação',
  'Supermercado',
  'Restaurantes',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Serviços (Água/Luz/Net)',
  'Investimentos',
  'Salário',
  'Outros'
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2023-10-01',
    description: 'Salário Mensal',
    amount: 2500,
    type: TransactionType.INCOME,
    category: 'Salário',
    member: FamilyMember.ME
  },
  {
    id: '2',
    date: '2023-10-02',
    description: 'Pingo Doce Compras',
    amount: 150.45,
    type: TransactionType.EXPENSE,
    category: 'Supermercado',
    member: FamilyMember.JOINT
  },
  {
    id: '3',
    date: '2023-10-05',
    description: 'EDP Comercial',
    amount: 85.20,
    type: TransactionType.EXPENSE,
    category: 'Serviços (Água/Luz/Net)',
    member: FamilyMember.JOINT
  },
  {
    id: '4',
    date: '2023-10-10',
    description: 'Abastecimento Galp',
    amount: 60.00,
    type: TransactionType.EXPENSE,
    category: 'Transporte',
    member: FamilyMember.ME
  },
  {
    id: '5',
    date: '2023-10-12',
    description: 'Jantar Restaurante O Mar',
    amount: 45.50,
    type: TransactionType.EXPENSE,
    category: 'Restaurantes',
    member: FamilyMember.PARTNER
  },
  {
    id: '6',
    date: '2023-10-15',
    description: 'Salário Esposa',
    amount: 2200,
    type: TransactionType.INCOME,
    category: 'Salário',
    member: FamilyMember.PARTNER
  }
];
