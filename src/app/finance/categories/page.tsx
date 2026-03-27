"use client"

import { useEffect, useMemo, useState } from "react"

import { useFinanceStore } from "@/features/finance/store"
import type { Id } from "@/features/finance/types"
import { MonthPeriodBar } from "@/features/finance/ui/components/PeriodBars"
import { FinanceDialog } from "@/features/finance/ui/components/Dialog"
import { categoryName, formatMoney, monthTransactions } from "@/features/finance/utils"

export default function FinanceCategoriesPage() {
  const setView = useFinanceStore((s) => s.setView)
  useEffect(() => setView("categories"), [setView])

  const db = useFinanceStore((s) => s.db)
  const ui = useFinanceStore((s) => s.ui)
  const shiftActiveMonth = useFinanceStore((s) => s.shiftActiveMonth)
  const goTodayMonth = useFinanceStore((s) => s.goTodayMonth)

  const addCategory = useFinanceStore((s) => s.addCategory)
  const editCategory = useFinanceStore((s) => s.editCategory)
  const deleteCategory = useFinanceStore((s) => s.deleteCategory)

  const mTxs = useMemo(() => monthTransactions(db, ui.activeMonth), [db, ui.activeMonth])
  const mExp = useMemo(
    () => mTxs.filter((t) => t.type === "expense" && !t.transferId),
    [mTxs]
  )

  const spentByCat = useMemo(() => {
    const map = new Map<Id, number>()
    mExp.forEach((t) => {
      if (!t.categoryId) return
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    })
    return map
  }, [mExp])

  const groups = useMemo(() => {
    const g = new Map<string, typeof db.categories>()
    db.categories.forEach((c) => {
      const arr = g.get(c.parent) ?? []
      arr.push(c)
      g.set(c.parent, arr)
    })
    // stable ordering like legacy: by parent name, then num
    const entries = Array.from(g.entries()).sort((a, b) => a[0].localeCompare(b[0], "uk"))
    return entries.map(([parent, cats]) => ({
      parent,
      cats: [...cats].sort((a, b) => a.num - b.num),
    }))
  }, [db.categories])

  const totBudget = useMemo(() => db.categories.reduce((s, c) => s + (c.budget ?? 0), 0), [db.categories])
  const totSpent = useMemo(() => mExp.reduce((s, t) => s + t.amount, 0), [mExp])

  const [dlg, setDlg] = useState<null | { mode: "add" } | { mode: "edit"; id: Id }>(null)
  const toEdit = dlg?.mode === "edit" ? db.categories.find((c) => c.id === dlg.id) : null

  const parentsList = useMemo(
    () => Array.from(new Set(db.categories.map((c) => c.parent))).sort((a, b) => a.localeCompare(b, "uk")),
    [db.categories]
  )

  const [form, setForm] = useState<{ parent: string; name: string; budget: string }>({
    parent: "",
    name: "",
    budget: "0",
  })

  const openAdd = () => {
    setForm({ parent: "", name: "", budget: "0" })
    setDlg({ mode: "add" })
  }

  const openEdit = (id: Id) => {
    const c = db.categories.find((x) => x.id === id)
    if (!c) return
    setForm({ parent: c.parent, name: c.name, budget: String(c.budget ?? 0) })
    setDlg({ mode: "edit", id })
  }

  const budgetBar = (spent: number, budget: number) => {
    if (!(budget > 0)) return null
    const pct = Math.min(100, (spent / budget) * 100)
    const tone = pct >= 100 ? "bg-[var(--red)]" : pct >= 80 ? "bg-[var(--amber)]" : "bg-[var(--green)]"
    return (
      <div className="mt-2 h-1 w-full rounded bg-[var(--border-ui)]">
        <div className={`h-1 rounded ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="font-serif text-3xl font-semibold">Категорії</div>
        <button
          className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          onClick={openAdd}
        >
          + Додати категорію
        </button>
      </div>

      <MonthPeriodBar
        monthKey={ui.activeMonth}
        onPrev={() => shiftActiveMonth(-1)}
        onNext={() => shiftActiveMonth(1)}
        onToday={() => goTodayMonth()}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Бюджет місяця</div>
          <div className="mt-2 font-serif text-3xl font-semibold">{formatMoney(totBudget, "UAH")}</div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Витрачено</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[var(--red)]">{formatMoney(totSpent, "UAH")}</div>
        </div>
        <div className="rounded-xl border bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Залишок бюджету</div>
          <div
            className="mt-2 font-serif text-3xl font-semibold"
            style={{ color: totBudget - totSpent >= 0 ? "var(--green)" : "var(--red)" }}
          >
            {totBudget > 0 ? formatMoney(totBudget - totSpent, "UAH") : "—"}
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border bg-[var(--surface)] p-10 text-center text-muted-foreground shadow-sm">
          🏷️ Категорій ще немає
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ parent, cats }) => {
            const gSpent = cats.reduce((s, c) => s + (spentByCat.get(c.id) ?? 0), 0)
            const gBudget = cats.reduce((s, c) => s + (c.budget ?? 0), 0)
            return (
              <div key={parent}>
                <div className="mb-3 flex items-center gap-3 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  <span>{parent}</span>
                  <span className="ml-auto normal-case text-xs text-muted-foreground">
                    Витрачено: <strong className="text-[var(--red)]">{formatMoney(gSpent, "UAH")}</strong> /{" "}
                    {gBudget > 0 ? formatMoney(gBudget, "UAH") : "—"}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-[color:rgb(250,250,249)] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                        <tr>
                          <th className="px-4 py-3 text-left">№</th>
                          <th className="px-4 py-3 text-left">Підкатегорія</th>
                          <th className="px-4 py-3 text-right">Бюджет/міс</th>
                          <th className="px-4 py-3 text-right">Витрачено</th>
                          <th className="px-4 py-3 text-right">Різниця</th>
                          <th className="px-4 py-3 text-left"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cats.map((c) => {
                          const spent = spentByCat.get(c.id) ?? 0
                          const budget = c.budget ?? 0
                          const diff = budget - spent
                          return (
                            <tr key={c.id} className="border-b hover:bg-[color:rgb(250,250,249)]">
                              <td className="px-4 py-3 text-xs text-muted-foreground">{c.num}</td>
                              <td className="px-4 py-3">
                                <strong>{c.name}</strong>
                                {budgetBar(spent, budget)}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{budget > 0 ? formatMoney(budget, "UAH") : "—"}</td>
                              <td className="px-4 py-3 text-right font-semibold text-[var(--red)]">{spent > 0 ? formatMoney(spent, "UAH") : "—"}</td>
                              <td
                                className="px-4 py-3 text-right font-semibold"
                                style={{ color: budget > 0 ? (diff < 0 ? "var(--red)" : "var(--green)") : "inherit" }}
                              >
                                {budget > 0 ? `${diff >= 0 ? "+" : ""}${formatMoney(diff, "UAH")}` : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button className="rounded-md border px-2 py-1 text-xs hover:text-[var(--accent-ui)]" onClick={() => openEdit(c.id)}>
                                    ✏️
                                  </button>
                                  <button
                                    className="rounded-md border px-2 py-1 text-xs hover:border-[var(--red)] hover:text-[var(--red)]"
                                    onClick={() => {
                                      if (confirm("Видалити категорію?")) deleteCategory(c.id)
                                    }}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FinanceDialog
        open={dlg !== null}
        title={dlg?.mode === "edit" ? "Редагувати категорію" : "Нова підкатегорія"}
        onClose={() => setDlg(null)}
        footer={
          <>
            <button className="rounded-md border px-4 py-2 text-sm hover:bg-accent" onClick={() => setDlg(null)}>
              Скасувати
            </button>
            <button
              className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              onClick={() => {
                if (!form.parent.trim() || !form.name.trim()) return alert("Заповніть обидва поля")
                const budget = Number(form.budget) || 0
                if (dlg?.mode === "edit" && toEdit) {
                  editCategory(toEdit.id, { parent: form.parent.trim(), name: form.name.trim(), budget })
                } else {
                  addCategory({ parent: form.parent.trim(), name: form.name.trim(), budget })
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
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Батьківська категорія</label>
            <input
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              list="parent-list"
              value={form.parent}
              onChange={(e) => setForm((s) => ({ ...s, parent: e.target.value }))}
              placeholder="Їжа, Транспорт, Розваги…"
            />
            <datalist id="parent-list">
              {parentsList.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Назва підкатегорії</label>
            <input
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Супермаркет, Таксі, Аптека…"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Бюджет на місяць (₴)</label>
            <input
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              type="number"
              min="0"
              value={form.budget}
              onChange={(e) => setForm((s) => ({ ...s, budget: e.target.value }))}
            />
          </div>
        </div>
      </FinanceDialog>
    </div>
  )
}

