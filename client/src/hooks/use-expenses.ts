import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { Expense, InsertExpense } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
//import { useExpenseTotals } from '@/hooks/use-expenses';

/**
 * Live hook to return all expenses (recent first).
 */
export function useExpenses(): Expense[] {
  const expenses = useLiveQuery(() =>
    db.expenses
      .orderBy('createdAt')
      .reverse()
      .toArray()
  ) || [];
  return expenses;
}

/**
 * Hook to add new expense to IndexedDB (Dexie).
 */
export function useAddExpense() {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation(
    async (payload: InsertExpense) => {
      const now = new Date().toISOString();
      const expense: Expense = {
        ...payload,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
      } as Expense;

      await db.expenses.add(expense as any);
      return expense;
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['expenses']);
        toast({ title: 'Expense added' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to add expense', description: String(err) });
      },
    }
  );
}

/**
 * Update existing expense
 */
export function useUpdateExpense() {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation(
    async (expense: Expense) => {
      const updated = { ...expense, updatedAt: new Date().toISOString() };
      await db.expenses.put(updated as any);
      return updated;
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['expenses']);
        toast({ title: 'Expense updated' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to update expense', description: String(err) });
      },
    }
  );
}

/**
 * Delete an expense by id
 */
export function useDeleteExpense() {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation(
    async (id: string) => {
      await db.expenses.delete(id as any);
      return id;
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['expenses']);
        toast({ title: 'Expense deleted' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to delete expense', description: String(err) });
      },
    }
  );
}

/**
 * Utility to compute totals (today/week/month). Returns numbers.
 */
export function useExpenseTotals() {
  const expenses = useExpenses();
  // compute iso date strings
  const today = new Date().toISOString().split('T')[0];

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split('T')[0];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split('T')[0];

  const todayTotal = expenses
    .filter(expense => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const weekTotal = expenses
    .filter(expense => expense.date >= weekStart)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthTotal = expenses
    .filter(expense => expense.date >= monthStart)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    todayTotal,
    weekTotal,
    monthTotal,
  };
}
