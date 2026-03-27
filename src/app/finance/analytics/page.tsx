"use client"

import { useEffect, useMemo } from "react"
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useFinanceStore } from "@/features/finance/store"
import { YearPeriodBar } from "@/features/finance/ui/components/PeriodBars"
import {
  formatMoney,
  monthTransactions,
  realExpense,
  realIncome,
} from "@/features/finance/utils"

export default function FinanceAnalyticsPage() {
  const setView = useFinanceStore((s) => s.setView)
  useEffect(() => setView("analytics"), [setView])

  const db = useFinanceStore((s) => s.db)
  const ui = useFinanceStore((s) => s.ui)
  const shiftActiveYear = useFinanceStore((s) => s.shiftActiveYear)
  const goThisYear = useFinanceStore((s) => s.goThisYear)

  const parents = useMemo(
    () => Array.from(new Set(db.categories.map((c) => c.parent))).sort((a, b) => a.localeCompare(b, "uk")),
    [db.categories]
  )

  const months = useMemo(() => {
    const y = ui.activeYear
    return Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0")
      const str = `${y}-${m}`
      const lbl = new Date(y, i, 1).toLocaleString("uk-UA", { month: "short" })
      return { str, lbl }
    })
  }, [ui.activeYear])

  const data = useMemo(() => {
    return months.map((m) => {
      const txs = monthTransactions(db, m.str)
      const income = realIncome(txs)
      const exp = realExpense(txs)

      const byParent: Record<string, number> = {}
      parents.forEach((p) => {
        const ids = db.categories.filter((c) => c.parent === p).map((c) => c.id)
        byParent[p] = txs
          .filter((t) => t.type === "expense" && !t.transferId && t.categoryId && ids.includes(t.categoryId))
          .reduce((s, t) => s + t.amount, 0)
      })

      return {
        ...m,
        income,
        exp,
        net: income - exp,
        byParent,
      }
    })
  }, [db, months, parents])

  const yearIncome = useMemo(() => data.reduce((s, m) => s + m.income, 0), [data])
  const yearExpense = useMemo(() => data.reduce((s, m) => s + m.exp, 0), [data])
  const yearNet = yearIncome - yearExpense

  const chartData = useMemo(
    () =>
      data.map((m) => ({
        month: m.lbl,
        income: m.income,
        expense: m.exp,
      })),
    [data]
  )

  const totalsByParent = useMemo(() => {
    const tot: Record<string, number> = {}
    parents.forEach((p) => {
      tot[p] = data.reduce((s, m) => s + (m.byParent[p] ?? 0), 0)
    })
    return tot
  }, [data, parents])

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="font-serif text-3xl font-semibold">Аналітика</div>
      </div>

      <YearPeriodBar
        year={ui.activeYear}
        onPrev={() => shiftActiveYear(-1)}
        onNext={() => shiftActiveYear(1)}
        onThisYear={() => goThisYear()}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Доходи за рік</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[var(--green)]">{formatMoney(yearIncome, "UAH")}</div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Витрати за рік</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[var(--red)]">{formatMoney(yearExpense, "UAH")}</div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Чистий результат</div>
          <div
            className="mt-2 font-serif text-3xl font-semibold"
            style={{ color: yearNet >= 0 ? "var(--green)" : "var(--red)" }}
          >
            {formatMoney(yearNet, "UAH")}
          </div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Сер. витрати / міс</div>
          <div className="mt-2 font-serif text-3xl font-semibold">{formatMoney(yearExpense / 12, "UAH")}</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
        <div className="mb-4 text-sm font-semibold">
          Доходи та витрати по місяцях, {ui.activeYear}{" "}
          <span className="text-xs font-normal text-muted-foreground">(без переказів)</span>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any, name: any) => [formatMoney(Number(value), "UAH"), name === "income" ? "Дохід" : "Витрата"]}
                contentStyle={{ borderRadius: 12 }}
              />
              <Legend />
              <Bar dataKey="income" name="Дохід" fill="rgba(22, 163, 74, 0.8)" radius={[6, 6, 6, 6]} />
              <Bar dataKey="expense" name="Витрата" fill="rgba(220, 38, 38, 0.75)" radius={[6, 6, 6, 6]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-semibold">Розбивка по місяцях</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[color:rgb(250,250,249)] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              <tr>
                <th className="px-4 py-3 text-left">Місяць</th>
                <th className="px-4 py-3 text-right">Дохід</th>
                <th className="px-4 py-3 text-right">Витрата</th>
                <th className="px-4 py-3 text-right">Баланс</th>
                {parents.map((p) => (
                  <th key={p} className="px-4 py-3 text-right">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.str} className="border-b hover:bg-[color:rgb(250,250,249)]">
                  <td className="px-4 py-3">
                    <strong>{m.lbl}</strong>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--green)]">
                    {m.income > 0 ? `+${formatMoney(m.income, "UAH")}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--red)]">
                    {m.exp > 0 ? formatMoney(m.exp, "UAH") : "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-semibold"
                    style={{ color: m.income || m.exp ? (m.net >= 0 ? "var(--green)" : "var(--red)") : "inherit" }}
                  >
                    {m.income || m.exp ? `${m.net >= 0 ? "+" : ""}${formatMoney(m.net, "UAH")}` : "—"}
                  </td>
                  {parents.map((p) => (
                    <td key={p} className="px-4 py-3 text-right text-muted-foreground">
                      {m.byParent[p] > 0 ? formatMoney(m.byParent[p], "UAH") : "—"}
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="bg-[var(--accent-soft)] font-semibold">
                <td className="px-4 py-3 font-serif text-base">Разом</td>
                <td className="px-4 py-3 text-right text-[var(--green)]">+{formatMoney(yearIncome, "UAH")}</td>
                <td className="px-4 py-3 text-right text-[var(--red)]">{formatMoney(yearExpense, "UAH")}</td>
                <td className="px-4 py-3 text-right" style={{ color: yearNet >= 0 ? "var(--green)" : "var(--red)" }}>
                  {formatMoney(yearNet, "UAH")}
                </td>
                {parents.map((p) => (
                  <td key={p} className="px-4 py-3 text-right text-muted-foreground">
                    {totalsByParent[p] > 0 ? formatMoney(totalsByParent[p], "UAH") : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

