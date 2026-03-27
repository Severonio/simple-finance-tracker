"use client"

import { useEffect, useMemo, useState } from "react"

import { useFinanceStore } from "@/features/finance/store"
import type { AccountType, Currency, Id } from "@/features/finance/types"
import { MonthPeriodBar } from "@/features/finance/ui/components/PeriodBars"
import { FinanceDialog } from "@/features/finance/ui/components/Dialog"
import { accountBalance, formatMoney, monthTransactions, realExpense, realIncome } from "@/features/finance/utils"

export default function FinanceAccountsPage() {
  const setView = useFinanceStore((s) => s.setView)
  const db = useFinanceStore((s) => s.db)
  const ui = useFinanceStore((s) => s.ui)
  const shiftActiveMonth = useFinanceStore((s) => s.shiftActiveMonth)
  const goTodayMonth = useFinanceStore((s) => s.goTodayMonth)

  const addAccount = useFinanceStore((s) => s.addAccount)
  const editAccount = useFinanceStore((s) => s.editAccount)
  const deleteAccount = useFinanceStore((s) => s.deleteAccount)

  useEffect(() => setView("accounts"), [setView])

  const mTxs = useMemo(() => monthTransactions(db, ui.activeMonth), [db, ui.activeMonth])

  const perAccMonth = useMemo(() => {
    const map = new Map<Id, { inc: number; exp: number }>()
    db.accounts.forEach((a) => {
      const txs = mTxs.filter((t) => t.accountId === a.id)
      map.set(a.id, { inc: realIncome(txs), exp: realExpense(txs) })
    })
    return map
  }, [db.accounts, mTxs])

  const [dlg, setDlg] = useState<null | { mode: "add" } | { mode: "edit"; id: Id }>(null)
  const toEdit = dlg?.mode === "edit" ? db.accounts.find((a) => a.id === dlg.id) : null

  const [form, setForm] = useState<{
    name: string
    type: AccountType
    currency: Currency
    initialBalance: string
  }>({ name: "", type: "card", currency: "UAH", initialBalance: "0" })

  const openAdd = () => {
    setForm({ name: "", type: "card", currency: "UAH", initialBalance: "0" })
    setDlg({ mode: "add" })
  }

  const openEdit = (id: Id) => {
    const a = db.accounts.find((x) => x.id === id)
    if (!a) return
    setForm({
      name: a.name,
      type: a.type,
      currency: a.currency,
      initialBalance: String(a.initialBalance ?? 0),
    })
    setDlg({ mode: "edit", id })
  }

  const typeMeta: Record<string, { label: string; icon: string; tone: string }> = {
    card: { label: "Картка", icon: "💳", tone: "bg-[var(--blue-soft)] text-[var(--blue)]" },
    cash: { label: "Готівка", icon: "💵", tone: "bg-[var(--amber-soft)] text-[var(--amber)]" },
    deposit: { label: "Депозит", icon: "🏛️", tone: "bg-[var(--purple-soft)] text-[var(--purple)]" },
    currency: { label: "Валюта", icon: "💱", tone: "bg-[var(--teal-soft)] text-[var(--teal)]" },
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-serif text-3xl font-semibold">Рахунки</div>
        </div>
        <button
          className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          onClick={openAdd}
        >
          + Додати рахунок
        </button>
      </div>

      <MonthPeriodBar
        monthKey={ui.activeMonth}
        onPrev={() => shiftActiveMonth(-1)}
        onNext={() => shiftActiveMonth(1)}
        onToday={() => goTodayMonth()}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {db.accounts.length === 0 ? (
          <div className="rounded-xl border bg-[var(--surface)] p-10 text-center text-muted-foreground shadow-sm md:col-span-3">
            🏦 Рахунків ще немає
          </div>
        ) : (
          db.accounts.map((a) => {
            const bal = accountBalance(db, a.id)
            const meta = typeMeta[a.type] ?? { label: a.type, icon: "💼", tone: "bg-[var(--blue-soft)] text-[var(--blue)]" }
            const month = perAccMonth.get(a.id) ?? { inc: 0, exp: 0 }
            return (
              <div key={a.id} className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{a.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${meta.tone}`}>
                        {meta.icon} {meta.label}
                      </span>{" "}
                      <span className="ml-2 text-xs text-muted-foreground">{a.currency}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md border px-2 py-1 text-xs hover:text-[var(--accent-ui)]" onClick={() => openEdit(a.id)}>
                      ✏️
                    </button>
                    <button
                      className="rounded-md border px-2 py-1 text-xs hover:border-[var(--red)] hover:text-[var(--red)]"
                      onClick={() => {
                        if (confirm("Видалити рахунок?")) deleteAccount(a.id)
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Початковий баланс</div>
                  <div className="mt-1 text-sm text-muted-foreground">{formatMoney(a.initialBalance, a.currency)}</div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Поточний баланс</div>
                  <div className="mt-1 font-serif text-2xl font-semibold" style={{ color: bal >= 0 ? "var(--green)" : "var(--red)" }}>
                    {formatMoney(bal, a.currency)}
                  </div>
                </div>

                <div className="mt-3 flex gap-4 text-xs">
                  <span className="font-semibold text-[var(--green)]">+{formatMoney(month.inc, a.currency)}</span>
                  <span className="font-semibold text-[var(--red)]">−{formatMoney(month.exp, a.currency)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-semibold">
            Всі рахунки{" "}
            <span className="ml-2 rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs text-muted-foreground">
              {db.accounts.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[color:rgb(250,250,249)] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              <tr>
                <th className="px-4 py-3 text-left">№</th>
                <th className="px-4 py-3 text-left">Назва</th>
                <th className="px-4 py-3 text-left">Тип</th>
                <th className="px-4 py-3 text-left">Валюта</th>
                <th className="px-4 py-3 text-left">Поч. баланс</th>
                <th className="px-4 py-3 text-left">Доходи (міс)</th>
                <th className="px-4 py-3 text-left">Витрати (міс)</th>
                <th className="px-4 py-3 text-left">Пот. баланс</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {db.accounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-muted-foreground">
                    Немає рахунків
                  </td>
                </tr>
              ) : (
                db.accounts.map((a) => {
                  const bal = accountBalance(db, a.id)
                  const meta = typeMeta[a.type] ?? { label: a.type, icon: "💼", tone: "bg-[var(--blue-soft)] text-[var(--blue)]" }
                  const month = perAccMonth.get(a.id) ?? { inc: 0, exp: 0 }
                  return (
                    <tr key={a.id} className="border-b hover:bg-[color:rgb(250,250,249)]">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.num}</td>
                      <td className="px-4 py-3">
                        <strong>{a.name}</strong>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${meta.tone}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{a.currency}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatMoney(a.initialBalance, a.currency)}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--green)]">
                        {month.inc > 0 ? `+${formatMoney(month.inc, a.currency)}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--red)]">
                        {month.exp > 0 ? formatMoney(month.exp, a.currency) : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: bal >= 0 ? "var(--green)" : "var(--red)" }}>
                        {formatMoney(bal, a.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="rounded-md border px-2 py-1 text-xs hover:text-[var(--accent-ui)]" onClick={() => openEdit(a.id)}>
                            ✏️
                          </button>
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:border-[var(--red)] hover:text-[var(--red)]"
                            onClick={() => {
                              if (confirm("Видалити рахунок?")) deleteAccount(a.id)
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FinanceDialog
        open={dlg !== null}
        title={dlg?.mode === "edit" ? "Редагувати рахунок" : "Новий рахунок"}
        onClose={() => setDlg(null)}
        footer={
          <>
            <button className="rounded-md border px-4 py-2 text-sm hover:bg-accent" onClick={() => setDlg(null)}>
              Скасувати
            </button>
            <button
              className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              onClick={() => {
                if (!form.name.trim()) return alert("Введіть назву")
                const initialBalance = Number(form.initialBalance) || 0

                if (dlg?.mode === "edit" && toEdit) {
                  editAccount(toEdit.id, {
                    name: form.name.trim(),
                    type: form.type,
                    currency: form.currency,
                    initialBalance,
                  })
                } else {
                  addAccount({
                    name: form.name.trim(),
                    type: form.type,
                    currency: form.currency,
                    initialBalance,
                  })
                }
                setDlg(null)
              }}
            >
              Зберегти
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Назва</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Monobank, ПриватБанк, Готівка…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Тип</label>
              <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as AccountType }))}>
                <option value="card">💳 Картка</option>
                <option value="cash">💵 Готівка</option>
                <option value="deposit">🏛️ Депозит</option>
                <option value="currency">💱 Валюта</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Валюта</label>
              <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value as Currency }))}>
                <option value="UAH">₴ UAH</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="PLN">zł PLN</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Початковий баланс</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" type="number" value={form.initialBalance} onChange={(e) => setForm((s) => ({ ...s, initialBalance: e.target.value }))} />
          </div>
        </div>
      </FinanceDialog>
    </div>
  )
}

