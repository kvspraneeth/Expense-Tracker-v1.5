import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CategorySelector } from './category-selector';
import { DatePicker } from './date-picker';
import { useAddExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { expenseFormSchema, Expense } from '@shared/schema';
import { format, parseISO } from 'date-fns';
import { useExpenseTotals } from '@/hooks/use-expenses';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCategory?: string;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, preSelectedCategory, editingExpense }: ExpenseFormProps) {
  const [attachments, setAttachments] = useState<string[]>([]);
  const addExpenseMutation = useAddExpense();

  const form = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: '' as any, // Start with empty string, will be converted to number on submission
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      category: '',
      items: '',
      where: '',
      note: '',
      paymentMethod: 'UPI' as const,
      account: 'ICICI' as const,
      isRecurring: false,
      isTemplate: false,
      attachments: [],
      id: '' as any,
    },
  });

  const updateExpenseMutation = useUpdateExpense();

  // If editingExpense is provided, populate form fields and attachments using useEffect
  useEffect(() => {
    if (editingExpense) {
      form.reset({
        amount: editingExpense.amount as any,
        date: editingExpense.date,
        time: editingExpense.time,
        category: editingExpense.category,
        items: editingExpense.items || '',
        where: editingExpense.where || '',
        note: editingExpense.note || '',
        paymentMethod: editingExpense.paymentMethod,
        account: editingExpense.account,
        isRecurring: editingExpense.isRecurring || false,
        isTemplate: editingExpense.isTemplate || false,
        attachments: editingExpense.attachments || [],
        id: editingExpense.id,
      });
      setAttachments(editingExpense.attachments || []);
    }
  }, [editingExpense]);

  // Update category when preSelectedCategory changes
  if (preSelectedCategory && form.getValues('category') !== preSelectedCategory) {
    form.setValue('category', preSelectedCategory);
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleClose = () => {
    form.reset();
    setAttachments([]);
    onOpenChange(false);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data, amount: parseFloat(data.amount) || 0, attachments };
      if (editingExpense && editingExpense.id) {
        await updateExpenseMutation.mutateAsync({ ...(payload as any), id: editingExpense.id });
      } else {
        await addExpenseMutation.mutateAsync(payload);
      }
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} placeholder="0.00" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category (CategorySelector is assumed available) */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategorySelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items/Where/Note */}
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="What did you buy?" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="where"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Vendor or place" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Any additional notes..." rows={3} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Payment Method, Account, Attachments etc. */}
            <div className="flex justify-end">
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {addExpenseMutation.isLoading || updateExpenseMutation?.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingExpense ? 'Update Expense' : 'Save Expense'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
