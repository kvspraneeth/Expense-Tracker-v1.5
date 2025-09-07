import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useExpenses } from '@/hooks/use-expenses';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/lib/db';
import { startOfWeek, format, parseISO, eachDayOfInterval, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

const COLORS = ['#22c55e', '#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

export function ExpenseCharts() {
  const expenses = useExpenses();
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const [aggregation, setAggregation] = useState<'week' | '30days' | 'month'>('week');

  // Category data for pie chart
  const categoryData = categories.map((category) => {
    const categoryExpenses = expenses.filter(expense => expense.category === category.id);
    const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      name: category.name,
      value: total,
      id: category.id,
      icon: category.icon,
    };
  }).filter(item => item.value > 0);

  // Daily / Range data for bar chart based on aggregation filter
  const now = new Date();
  let days: Date[] = [];
  if (aggregation === 'week') {
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  } else if (aggregation === '30days') {
    const start = subDays(now, 29);
    const end = now;
    days = eachDayOfInterval({ start, end });
  } else if (aggregation === 'month') {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    days = eachDayOfInterval({ start, end });
  }

  const dailyData = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayExpenses = expenses.filter(expense => expense.date === dayStr);
    const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      name: aggregation === 'week' ? format(day, 'EEE') : format(day, 'd'),
      amount: total,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Spending Breakdown</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Category distribution and daily trends</p>
        </div>
        <div>
          <select value={aggregation} onChange={(e) => setAggregation(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="week">This Week (Daily)</option>
            <option value="30days">Last 30 Days (Daily)</option>
            <option value="month">This Month (Daily)</option>
          </select>
        </div>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <span className="w-4 h-4 mr-2">🍰</span>
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {categoryData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ flex: 1, minWidth: 240, height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} label>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${entry.id}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ width: 220 }}>
                {categoryData.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <div style={{ width: 12, height: 12, background: COLORS[idx % COLORS.length], borderRadius: 3 }} />
                      <div>
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </div>
                    <div className="font-semibold">₹{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No expenses to display</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Bar Chart */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <span className="w-4 h-4 mr-2">📊</span>
            Daily Spending
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No data for selected range</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
