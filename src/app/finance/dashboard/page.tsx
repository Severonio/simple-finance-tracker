"use client"

import { useEffect, useMemo } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useFinanceStore } from "@/features/finance/store"
import { MonthPeriodBar } from "@/features/finance/ui/components/PeriodBars"
import type { Currency } from "@/features/finance/types"
import {
  accCurrency,
  accName,
  accountBalance,
  buildRows,
  categoryName,
  formatDateUa,
  formatMoney,
  monthTransactions,
  realExpense,
  realIncome,
} from "@/features/finance/utils"

export default function FinanceDashboardPage() {
  const setView = useFinanceStore((s) => s.setView)
  useEffect(() => setView("dashboard"), [setView])

  const db = useFinanceStore((s) => s.db)
  const ui = useFinanceStore((s) => s.ui)
  const shiftActiveMonth = useFinanceStore((s) => s.shiftActiveMonth)
  const goTodayMonth = useFinanceStore((s) => s.goTodayMonth)

  const mTxs = useMemo(() => monthTransactions(db, ui.activeMonth), [db, ui.activeMonth])
  const mInc = useMemo(() => realIncome(mTxs), [mTxs])
  const mExp = useMemo(() => realExpense(mTxs), [mTxs])
  const net = mInc - mExp

  const totalBalance = useMemo(
    () => db.accounts.reduce((sum, a) => sum + accountBalance(db, a.id), 0),
    [db]
  )

  const recentRows = useMemo(() => buildRows(db, mTxs).slice(0, 10), [db, mTxs])

  const expenseByCategory = useMemo(() => {
    const exp = mTxs.filter((t) => t.type === "expense" && !t.transferId)
    const map = new Map<string, number>()
    exp.forEach((t) => {
      const key = categoryName(db, t.categoryId)
      map.set(key, (map.get(key) ?? 0) + t.amount)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [db, mTxs])

  const balances = useMemo(() => {
    return db.accounts.map((a) => ({
      name: a.name,
      value: accountBalance(db, a.id),
    }))
  }, [db])

  const pieColors = [
    "var(--accent-ui)",
    "var(--green)",
    "var(--blue)",
    "var(--red)",
    "var(--purple)",
    "var(--teal)",
    "var(--amber)",
    "#db2777",
    "#65a30d",
  ]

  const barColors = [
    "rgba(220, 143, 61, 0.85)",
    "rgba(22, 163, 74, 0.85)",
    "rgba(37, 99, 235, 0.85)",
    "rgba(124, 58, 237, 0.85)",
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="font-serif text-3xl font-semibold">Дашборд</div>
      </div>

      <MonthPeriodBar
        monthKey={ui.activeMonth}
        onPrev={() => shiftActiveMonth(-1)}
        onNext={() => shiftActiveMonth(1)}
        onToday={() => goTodayMonth()}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Загальний баланс</div>
          <div className="mt-2 font-serif text-3xl font-semibold">{formatMoney(totalBalance, "UAH")}</div>
          <div className="mt-1 text-xs text-muted-foreground">По всіх рахунках</div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Доходи за місяць</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[var(--green)]">{formatMoney(mInc, "UAH")}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {mTxs.filter((t) => t.type === "income" && !t.transferId).length} надходжень
          </div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Витрати за місяць</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[var(--red)]">{formatMoney(mExp, "UAH")}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {mTxs.filter((t) => t.type === "expense" && !t.transferId).length} операцій
          </div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Чистий результат</div>
          <div
            className="mt-2 font-serif text-3xl font-semibold"
            style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}
          >
            {net >= 0 ? "+" : ""}
            {formatMoney(net, "UAH")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{net >= 0 ? "Профіцит" : "Дефіцит"}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="mb-4 text-sm font-semibold">Витрати за категоріями</div>
          <div className="h-[240px]">
            {expenseByCategory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Немає витрат за цей місяць
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={70} outerRadius={95} paddingAngle={2}>
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length] as any} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [formatMoney(Number(value), "UAH"), name]}
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="mb-4 text-sm font-semibold">Баланс рахунків</div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balances} margin={{ left: 8, right: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatMoney(Number(value), "UAH")} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                  {balances.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-semibold">
            Операції місяця{" "}
            <span className="ml-2 rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs text-muted-foreground">
              {recentRows.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[color:rgb(250,250,249)] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              <tr>
                <th className="px-4 py-3 text-left">Дата</th>
                <th className="px-4 py-3 text-left">Назва</th>
                <th className="px-4 py-3 text-left">Тип</th>
                <th className="px-4 py-3 text-left">Сума</th>
                <th className="px-4 py-3 text-left">Категорія</th>
                <th className="px-4 py-3 text-left">Рахунок</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    📭 Транзакцій за цей місяць немає
                  </td>
                </tr>
              ) : (
                recentRows.map((row) => {
                  if (row._kind === "transfer") {
                    const curr = accCurrency(db, row.from.accountId)
                    return (
                      <tr key={row.transferId} className="border-b bg-[rgba(37,99,235,0.03)] hover:bg-[rgba(37,99,235,0.06)]">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateUa(row.date)}</td>
                        <td className="px-4 py-3">
                          <strong>
                            {accName(db, row.from.accountId)} <span className="mx-1 text-[var(--blue)]">→</span>{" "}
                            {accName(db, row.to.accountId)}
                          </strong>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[var(--blue-soft)] px-2 py-1 text-xs font-semibold text-[var(--blue)]">
                            🔄 Переказ
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--blue)]">{formatMoney(row.amount, curr)}</td>
                        <td className="px-4 py-3">—</td>
                        <td className="px-4 py-3">—</td>
                      </tr>
                    )
                  }

                  const curr = accCurrency(db, row.accountId)
                  const isIncome = row.type === "income"
                  return (
                    <tr key={row.id} className="border-b hover:bg-[color:rgb(250,250,249)]">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateUa(row.date)}</td>
                      <td className="px-4 py-3">
                        <strong>{row.name}</strong>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-1 text-xs font-semibold"
                          style={{
                            background: isIncome ? "var(--green-soft)" : "var(--red-soft)",
                            color: isIncome ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {isIncome ? "📈 Дохід" : "📉 Витрата"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: isIncome ? "var(--green)" : "var(--red)" }}>
                        {isIncome ? "+" : "−"}
                        {formatMoney(row.amount, curr)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.categoryId ? categoryName(db, row.categoryId) : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{accName(db, row.accountId)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

