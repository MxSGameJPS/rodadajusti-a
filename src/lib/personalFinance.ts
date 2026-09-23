import type {
  PersonalExpenseCategory,
  PersonalFinanceState,
  PersonalFinanceTransaction,
  PlayerProfile,
} from '../types/game';
import { formatGameDate } from './gameDate';

export const PERSONAL_EXPENSE_CATEGORIES: Array<{
  id: PersonalExpenseCategory;
  label: string;
}> = [
  { id: 'DILIGENCIA', label: 'Diligências' },
  { id: 'COMBUSTIVEL', label: 'Combustível' },
  { id: 'ONIBUS', label: 'Ônibus' },
  { id: 'UBER_TAXI', label: 'Uber / Táxi' },
  { id: 'HOTEL', label: 'Hotel' },
  { id: 'ALIMENTACAO', label: 'Alimentação' },
  { id: 'SUPERMERCADO', label: 'Supermercado' },
  { id: 'MORADIA', label: 'Moradia & contas' },
  { id: 'MOVEIS', label: 'Móveis' },
  { id: 'VEICULO', label: 'Veículos' },
  { id: 'VESTUARIO', label: 'Vestuário' },
  { id: 'LAZER', label: 'Lazer' },
  { id: 'ESTUDOS', label: 'Estudos' },
  { id: 'MUDANCA', label: 'Mudança' },
  { id: 'OUTROS', label: 'Outros' },
];

export function recoverLegacyPersonalFinances(
  player: Partial<PlayerProfile>,
): PersonalFinanceState {
  const recovered: PersonalFinanceTransaction[] = [];
  const logs = Array.isArray(player.activeCase?.logs) ? player.activeCase!.logs : [];

  logs.forEach((log, index) => {
    if (log.type !== 'viagem') return;
    const match = String(log.message || '').match(/Deslocamento para (.+?) \([^)]*-R\$\s*([\d.,]+)/i);
    if (!match) return;

    const amount = Number(match[2].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    recovered.push({
      id: `legacy-travel-${player.activeCase?.caseId || 'case'}-${index}`,
      type: 'EXPENSE',
      category: 'DILIGENCIA',
      amount,
      title: `Diligência — ${match[1].trim()}`,
      description: 'Despesa recuperada do histórico de deslocamentos do save anterior.',
      gameDate: formatGameDate({
        day: Number(player.gameCurrentDay) || 1,
        month: Number(player.gameCurrentMonth) || 1,
        year: Number(player.gameCurrentYear) || 2026,
      }),
      source: 'LEGACY_CASE_TRAVEL',
    });
  });

  return {
    transactions: recovered.slice(0, 250),
    lastCompensationMonthKey: [
      String(Number(player.gameCurrentYear) || 2026),
      String(Number(player.gameCurrentMonth) || 1).padStart(2, '0'),
    ].join('-'),
  };
}

export function normalizePersonalFinances(
  value?: Partial<PersonalFinanceState> | null,
): PersonalFinanceState {
  return {
    transactions: Array.isArray(value?.transactions)
      ? value!.transactions
          .filter((item): item is PersonalFinanceTransaction => Boolean(
            item
            && typeof item.id === 'string'
            && typeof item.title === 'string'
            && Number.isFinite(Number(item.amount)),
          ))
          .map((item) => ({
            ...item,
            amount: Math.max(0, Number(item.amount) || 0),
          }))
          .slice(0, 250)
      : [],
    lastCompensationMonthKey: typeof value?.lastCompensationMonthKey === 'string'
      ? value.lastCompensationMonthKey
      : null,
  };
}

export function createPersonalExpense(
  player: PlayerProfile,
  input: {
    category: PersonalExpenseCategory;
    amount: number;
    title: string;
    description?: string;
    source?: string;
  },
): PersonalFinanceTransaction {
  return {
    id: `expense-${input.category.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'EXPENSE',
    category: input.category,
    amount: Math.max(0, Number(input.amount) || 0),
    title: input.title,
    description: input.description,
    gameDate: formatGameDate({
      day: player.gameCurrentDay,
      month: player.gameCurrentMonth,
      year: player.gameCurrentYear,
    }),
    source: input.source,
  };
}

export function createPersonalIncome(
  player: PlayerProfile,
  input: {
    category: 'REMUNERACAO' | 'HONORARIOS' | 'OUTRA_RECEITA';
    amount: number;
    title: string;
    description?: string;
    source?: string;
  },
): PersonalFinanceTransaction {
  return {
    id: `income-${input.category.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'INCOME',
    category: input.category,
    amount: Math.max(0, Number(input.amount) || 0),
    title: input.title,
    description: input.description,
    gameDate: formatGameDate({
      day: player.gameCurrentDay,
      month: player.gameCurrentMonth,
      year: player.gameCurrentYear,
    }),
    source: input.source,
  };
}

export function appendPersonalFinanceTransaction(
  state: PersonalFinanceState,
  transaction: PersonalFinanceTransaction,
): PersonalFinanceState {
  return {
    ...state,
    transactions: [transaction, ...(state.transactions || [])].slice(0, 250),
  };
}

export function getPersonalExpenseTotal(state: PersonalFinanceState) {
  return (state.transactions || [])
    .filter((item) => item.type === 'EXPENSE')
    .reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
}

export function getPersonalExpenseTotalsByCategory(state: PersonalFinanceState) {
  const totals = new Map<PersonalExpenseCategory, number>();
  PERSONAL_EXPENSE_CATEGORIES.forEach((category) => totals.set(category.id, 0));

  (state.transactions || []).forEach((item) => {
    if (item.type !== 'EXPENSE') return;
    if (!totals.has(item.category as PersonalExpenseCategory)) return;
    totals.set(
      item.category as PersonalExpenseCategory,
      (totals.get(item.category as PersonalExpenseCategory) || 0)
        + Math.max(0, Number(item.amount) || 0),
    );
  });

  return totals;
}
