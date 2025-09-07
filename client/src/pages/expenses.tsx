/* top imports unchanged... */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Edit2, Trash2, ChevronDown, ChevronUp, FileText, Tv, Heart, ShoppingBag, LucideIcon } from 'lucide-react';
import { useExpenses, useDeleteExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { getCategoryColor } from '@/lib/categories';
import { useSettings } from '@/hooks/use-settings';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

interface ExpensesProps {
  onOpenExpenseForm: (payload?: string | any) => void;
}

export function Expenses({ onOpenExpenseForm }: ExpensesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());

  const expenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useSettings();
  const deleteExpenseMutation = useDeleteExpense();
  const updateExpenseMutation = useUpdateExpense();

  const currency = settings?.currency || '₹';

  const getIconComponent = (iconName: string) => {
    const IconComponent = (null as any); // your icon mapping
    return IconComponent ? <IconComponent className="w-5 h-5" /> : <FileText className="w-5 h-5" />;
  };

  const toggleExpand = (expenseId: string) => {
    setExpandedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) newSet.delete(expenseId); else newSet.add(expenseId);
      return newSet;
    });
  };

  const handleEditExpense = (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (expense) {
      // Open form in edit mode, pass the full expense
      onOpenExpenseForm(expense);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpenseMutation.mutateAsync(id);
    }
  };

  // Filter & group logic (kept same)
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm ||
      expense.items?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.where?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesPayment = paymentFilter === 'all' || expense.paymentMethod === paymentFilter;

    return matchesSearch && matchesCategory && matchesPayment;
  });

  const groupedExpenses = filteredExpenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, typeof expenses>);

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Total: {currency}{totalAmount.toLocaleString()} ({filteredExpenses.length} transactions)
          </p>
        </div>
        <Button onClick={() => onOpenExpenseForm()} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Filters & list omitted for brevity (kept same as before) */}

      {/* Expenses List */}
      {Object.entries(groupedExpenses).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No expenses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExpenses).map(([date, items]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle>{format(parseISO(date), 'MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {items.map((expense) => {
                  const category = categories.find(c => c.id === expense.category) || { id: expense.category, name: 'Other', icon: '📝', color: 'gray' };
                  const isExpanded = expandedExpenses.has(expense.id);
                  const hasDetails = !!(expense.note || (expense.attachments && expense.attachments.length > 0));

                  return (
                    <div key={expense.id} className="py-2 border-b last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-md flex items-center justify-center bg-gray-100">
                            {getIconComponent(category.icon)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{expense.items || category.name}</p>
                            {expense.where && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{expense.where}</p>
                            )}
                            {/* Basic displays kept compact on purpose */}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="font-semibold text-red-600 dark:text-red-400">{`-${currency}${expense.amount.toLocaleString()}`}</p>
                          </div>

                          <div className="flex space-x-1">
                            {hasDetails && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(expense.id)}
                                className="text-gray-400 hover:text-blue-500 p-1 h-auto"
                                data-testid={`button-expand-${expense.id}`}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpense(expense.id)}
                              className="text-gray-400 hover:text-blue-500 p-1 h-auto"
                              data-testid={`button-edit-${expense.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-gray-400 hover:text-red-500 p-1 h-auto"
                              data-testid={`button-delete-${expense.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details (note, attachments, time/payment/account shown here) */}
                      {isExpanded && hasDetails && (
                        <div className="border-t border-gray-200 dark:border-gray-600 px-3 py-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{expense.time} • {expense.paymentMethod} • {expense.account}</p>
                          {expense.note && (
                            <div className="mt-2">
                              <p className="text-sm">{expense.note}</p>
                            </div>
                          )}
                          {expense.attachments && expense.attachments.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {expense.attachments.map((att, i) => (
                                <img key={i} src={att} className="w-full h-20 object-cover rounded" alt="attachment" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
