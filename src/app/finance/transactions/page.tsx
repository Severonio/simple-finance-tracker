"use client"

import { useEffect, useMemo, useState } from "react"

import { useFinanceStore } from "@/features/finance/store"
import type { Id, Transaction } from "@/features/finance/types"
import {
  accCurrency,
  accName,
  buildRows,
  categoryName,
  formatDateUa,
  formatMoney,
  monthKeyFromDate,
  realExpense,
  realIncome,
} from "@/features/finance/utils"
import { FinanceCalendar } from "@/features/finance/ui/components/Calendar"
import { FinanceDialog } from "@/features/finance/ui/components/Dialog"

export default function FinanceTransactionsPage() {
  const setView = useFinanceStore((s) => s.setView)
  const db = useFinanceStore((s) => s.db)
  const ui = useFinanceStore((s) => s.ui)
  const calendarShiftMonth = useFinanceStore((s) => s.calendarShiftMonth)
  const calendarToggleMonth = useFinanceStore((s) => s.calendarToggleMonth)
  const calendarToggleDay = useFinanceStore((s) => s.calendarToggleDay)
  const calendarClear = useFinanceStore((s) => s.calendarClear)
  const setFilter = useFinanceStore((s) => s.setFilter)
  const resetFilters = useFinanceStore((s) => s.resetFilters)
  const addTransaction = useFinanceStore((s) => s.addTransaction)
  const editTransaction = useFinanceStore((s) => s.editTransaction)
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction)
  const addTransfer = useFinanceStore((s) => s.addTransfer)
  const editTransfer = useFinanceStore((s) => s.editTransfer)
  const deleteTransfer = useFinanceStore((s) => s.deleteTransfer)

  useEffect(() => setView("transactions"), [setView])

  const [txDialog, setTxDialog] = useState<null | { mode: "add" } | { mode: "edit"; id: Id }>(null)
  const [transferDialog, setTransferDialog] = useState<null | { mode: "add" } | { mode: "edit"; transferId: string }>(
    null
  )

  const activeDates = useMemo(() => new Set(db.transactions.map((t) => t.date)), [db.transactions])

  const filteredTxs = useMemo(() => {
    let txs = [...db.transactions]

    // calendar filter
    if (ui.selDay) {
      txs = txs.filter((t) => t.date === ui.selDay)
    } else if (ui.selMonth) {
      const [yS, mS] = ui.calDate.split("-")
      const monthKey = `${yS}-${mS}`
      txs = txs.filter((t) => t.date && t.date.startsWith(monthKey))
    }

    // type filter
    if (ui.filters.type === "income") txs = txs.filter((t) => t.type === "income" && !t.transferId)
    if (ui.filters.type === "expense") txs = txs.filter((t) => t.type === "expense" && !t.transferId)
    if (ui.filters.type === "transfer") txs = txs.filter((t) => !!t.transferId)

    // account filter: for transfers show if either side matches
    if (ui.filters.accountId !== "") {
      const aid = ui.filters.accountId
      txs = txs.filter((t) => {
        if (t.transferId) {
          const pair = db.transactions.filter((x) => x.transferId === t.transferId)
          return pair.some((x) => x.accountId === aid)
        }
        return t.accountId === aid
      })
    }

    // category filter
    if (ui.filters.categoryId !== "") txs = txs.filter((t) => t.categoryId === ui.filters.categoryId)

    // parent category filter
    if (ui.filters.parent !== "") {
      const ids = db.categories.filter((c) => c.parent === ui.filters.parent).map((c) => c.id)
      txs = txs.filter((t) => (t.categoryId ? ids.includes(t.categoryId) : false))
    }

    return txs
  }, [db.categories, db.transactions, ui.calDate, ui.filters, ui.selDay, ui.selMonth])

  const rows = useMemo(() => buildRows(db, filteredTxs), [db, filteredTxs])
  const netInc = useMemo(() => realIncome(filteredTxs), [filteredTxs])
  const netExp = useMemo(() => realExpense(filteredTxs), [filteredTxs])
  const net = netInc - netExp

  const parents = useMemo(() => Array.from(new Set(db.categories.map((c) => c.parent))), [db.categories])

  const txToEdit = txDialog?.mode === "edit" ? db.transactions.find((t) => t.id === txDialog.id) : null
  const transferToEdit =
    transferDialog?.mode === "edit"
      ? (() => {
          const pair = db.transactions.filter((t) => t.transferId === transferDialog.transferId)
          const from = pair.find((t) => t.type === "expense")
          const to = pair.find((t) => t.type === "income")
          if (!from || !to) return null
          return { from, to }
        })()
      : null

  const today = useMemo(() => new Date().toISOString().split("T")[0] ?? "", [])

  const [txForm, setTxForm] = useState<{
    date: string
    type: "expense" | "income"
    name: string
    amount: string
    accountId: string
    categoryId: string
    note: string
  }>({
    date: ui.selDay ?? today,
    type: "expense",
    name: "",
    amount: "",
    accountId: String(db.accounts[0]?.id ?? ""),
    categoryId: "",
    note: "",
  })

  const [trForm, setTrForm] = useState<{
    date: string
    fromAccountId: string
    toAccountId: string
    amount: string
    note: string
  }>({
    date: ui.selDay ?? today,
    fromAccountId: String(db.accounts[0]?.id ?? ""),
    toAccountId: String(db.accounts[1]?.id ?? db.accounts[0]?.id ?? ""),
    amount: "",
    note: "",
  })

  const openAddTx = () => {
    setTxForm({
      date: ui.selDay ?? today,
      type: "expense",
      name: "",
      amount: "",
      accountId: String(db.accounts[0]?.id ?? ""),
      categoryId: "",
      note: "",
    })
    setTxDialog({ mode: "add" })
  }

  const openEditTx = (t: Transaction) => {
    setTxForm({
      date: t.date,
      type: t.type,
      name: t.name,
      amount: String(t.amount),
      accountId: String(t.accountId),
      categoryId: t.categoryId ? String(t.categoryId) : "",
      note: t.note ?? "",
    })
    setTxDialog({ mode: "edit", id: t.id })
  }

  const openAddTransfer = () => {
    setTrForm({
      date: ui.selDay ?? today,
      fromAccountId: String(db.accounts[0]?.id ?? ""),
      toAccountId: String(db.accounts[1]?.id ?? db.accounts[0]?.id ?? ""),
      amount: "",
      note: "",
    })
    setTransferDialog({ mode: "add" })
  }

  const openEditTransfer = (transferId: string) => {
    const pair = db.transactions.filter((t) => t.transferId === transferId)
    const from = pair.find((t) => t.type === "expense")
    const to = pair.find((t) => t.type === "income")
    if (!from || !to) return
    setTrForm({
      date: from.date,
      fromAccountId: String(from.accountId),
      toAccountId: String(to.accountId),
      amount: String(from.amount),
      note: from.note ?? "",
    })
    setTransferDialog({ mode: "edit", transferId })
  }

  const chip = useMemo(() => {
    if (ui.selDay) return formatDateUa(ui.selDay)
    if (ui.selMonth) {
      const monthKey = `${ui.calDate.slice(0, 7)}`
      const [yS, mS] = monthKey.split("-")
      return new Date(Number(yS), Number(mS) - 1, 1).toLocaleString("uk-UA", { month: "long", year: "numeric" })
    }
    return null
  }, [ui.calDate, ui.selDay, ui.selMonth])

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-serif text-3xl font-semibold">Транзакції</div>
          <div className="mt-1 text-sm text-muted-foreground">Всі фінансові операції</div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border px-4 py-2 text-sm hover:bg-accent" onClick={openAddTransfer}>
            🔄 Переказ
          </button>
          <button
            className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
            onClick={openAddTx}
          >
            + Додати
          </button>
        </div>
      </div>

      <FinanceCalendar
        calDateIso={ui.calDate}
        selectedDayIso={ui.selDay}
        selectedMonth={ui.selMonth}
        activeDates={activeDates}
        onPrevMonth={() => calendarShiftMonth(-1)}
        onNextMonth={() => calendarShiftMonth(1)}
        onToggleMonth={() => calendarToggleMonth()}
        onToggleDay={(iso) => calendarToggleDay(iso)}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex min-w-[170px] flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Тип</label>
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={ui.filters.type}
            onChange={(e) => setFilter("type", e.target.value as any)}
          >
            <option value="">Всі типи</option>
            <option value="income">📈 Дохід</option>
            <option value="expense">📉 Витрата</option>
            <option value="transfer">🔄 Переказ</option>
          </select>
        </div>

        <div className="flex min-w-[190px] flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Рахунок</label>
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={ui.filters.accountId === "" ? "" : String(ui.filters.accountId)}
            onChange={(e) => setFilter("accountId", e.target.value === "" ? "" : (Number(e.target.value) as Id))}
          >
            <option value="">Всі рахунки</option>
            {db.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[190px] flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Група</label>
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={ui.filters.parent}
            onChange={(e) => setFilter("parent", e.target.value)}
          >
            <option value="">Всі групи</option>
            {parents.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[240px] flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Категорія</label>
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={ui.filters.categoryId === "" ? "" : String(ui.filters.categoryId)}
            onChange={(e) => setFilter("categoryId", e.target.value === "" ? "" : (Number(e.target.value) as Id))}
          >
            <option value="">Всі категорії</option>
            {db.categories
              .filter((c) => (ui.filters.parent ? c.parent === ui.filters.parent : true))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent} → {c.name}
                </option>
              ))}
          </select>
        </div>

        {(ui.filters.type || ui.filters.accountId !== "" || ui.filters.categoryId !== "" || ui.filters.parent || ui.selDay || ui.selMonth) && (
          <button
            className="ml-auto rounded-md border px-3 py-2 text-xs text-muted-foreground hover:border-[var(--red)] hover:text-[var(--red)]"
            onClick={() => {
              resetFilters()
              calendarClear()
            }}
          >
            ✕ Скинути
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {chip && (
          <button
            className="inline-flex items-center gap-2 rounded-full border bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-ui)]"
            onClick={() => calendarClear()}
          >
            {chip} <span className="text-lg leading-none opacity-70">×</span>
          </button>
        )}
        {rows.length > 0 && (
          <div className="ml-auto text-sm text-muted-foreground">
            Дохід: <span className="font-semibold text-[var(--green)]">+{formatMoney(netInc, "UAH")}</span> · Витрата:{" "}
            <span className="font-semibold text-[var(--red)]">{formatMoney(netExp, "UAH")}</span> · Результат:{" "}
            <span className="font-semibold" style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>
              {net >= 0 ? "+" : ""}
              {formatMoney(net, "UAH")}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-semibold">
            Операції <span className="ml-2 rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs text-muted-foreground">{rows.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[color:rgb(250,250,249)] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              <tr>
                <th className="px-4 py-3 text-left">№</th>
                <th className="px-4 py-3 text-left">Дата</th>
                <th className="px-4 py-3 text-left">Назва / Рахунки</th>
                <th className="px-4 py-3 text-left">Сума</th>
                <th className="px-4 py-3 text-left">Тип</th>
                <th className="px-4 py-3 text-left">Рахунок</th>
                <th className="px-4 py-3 text-left">Категорія</th>
                <th className="px-4 py-3 text-left">Примітка</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-muted-foreground">
                    📭 Немає операцій за обраними фільтрами
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  if (row._kind === "transfer") {
                    const curr = accCurrency(db, row.from.accountId)
                    return (
                      <tr key={row.transferId} className="border-b bg-[rgba(37,99,235,0.03)] hover:bg-[rgba(37,99,235,0.06)]">
                        <td className="px-4 py-3 text-[11px] text-[var(--blue)]">🔄</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateUa(row.date)}</td>
                        <td className="px-4 py-3">
                          <strong>
                            {accName(db, row.from.accountId)} <span className="mx-1 text-[var(--blue)]">→</span>{" "}
                            {accName(db, row.to.accountId)}
                          </strong>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--blue)]">{formatMoney(row.amount, curr)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[var(--blue-soft)] px-2 py-1 text-xs font-semibold text-[var(--blue)]">
                            🔄 Переказ
                          </span>
                        </td>
                        <td className="px-4 py-3">—</td>
                        <td className="px-4 py-3">—</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.note || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="rounded-md border px-2 py-1 text-xs hover:text-[var(--accent-ui)]" onClick={() => openEditTransfer(row.transferId)}>
                              ✏️
                            </button>
                            <button
                              className="rounded-md border px-2 py-1 text-xs hover:border-[var(--red)] hover:text-[var(--red)]"
                              onClick={() => {
                                if (confirm("Видалити переказ? Обидві операції буде видалено.")) deleteTransfer(row.transferId)
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  const curr = accCurrency(db, row.accountId)
                  const isIncome = row.type === "income"
                  return (
                    <tr key={row.id} className="border-b hover:bg-[color:rgb(250,250,249)]">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.num}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateUa(row.date)}</td>
                      <td className="px-4 py-3">
                        <strong>{row.name}</strong>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: isIncome ? "var(--green)" : "var(--red)" }}>
                        {isIncome ? "+" : "−"}
                        {formatMoney(row.amount, curr)}
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
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[var(--bg)] px-2 py-1 text-xs font-semibold text-muted-foreground">
                          {accName(db, row.accountId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.categoryId ? categoryName(db, row.categoryId) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.note || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="rounded-md border px-2 py-1 text-xs hover:text-[var(--accent-ui)]" onClick={() => openEditTx(row)}>
                            ✏️
                          </button>
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:border-[var(--red)] hover:text-[var(--red)]"
                            onClick={() => {
                              if (confirm("Видалити транзакцію?")) deleteTransaction(row.id)
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
        open={txDialog !== null}
        title={txDialog?.mode === "edit" ? "Редагувати транзакцію" : "Нова транзакція"}
        onClose={() => setTxDialog(null)}
        footer={
          <>
            <button className="rounded-md border px-4 py-2 text-sm hover:bg-accent" onClick={() => setTxDialog(null)}>
              Скасувати
            </button>
            <button
              className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              onClick={() => {
                const amount = Number(txForm.amount)
                if (!txForm.name.trim()) return alert("Введіть назву")
                if (!(amount > 0)) return alert("Сума має бути більше 0")
                if (!txForm.accountId) return alert("Оберіть рахунок")

                if (txDialog?.mode === "edit" && txToEdit) {
                  editTransaction(txToEdit.id, {
                    date: txForm.date,
                    type: txForm.type,
                    name: txForm.name.trim(),
                    amount,
                    accountId: Number(txForm.accountId) as Id,
                    categoryId: txForm.categoryId ? (Number(txForm.categoryId) as Id) : null,
                    note: txForm.note.trim(),
                  })
                } else {
                  addTransaction({
                    date: txForm.date,
                    type: txForm.type,
                    name: txForm.name.trim(),
                    amount,
                    accountId: Number(txForm.accountId) as Id,
                    categoryId: txForm.categoryId ? (Number(txForm.categoryId) as Id) : null,
                    note: txForm.note.trim(),
                  })
                }
                setTxDialog(null)
              }}
            >
              Зберегти
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Дата</label>
              <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" type="date" value={txForm.date} onChange={(e) => setTxForm((s) => ({ ...s, date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Тип</label>
              <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={txForm.type} onChange={(e) => setTxForm((s) => ({ ...s, type: e.target.value as any }))}>
                <option value="expense">📉 Витрата</option>
                <option value="income">📈 Дохід</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Назва</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={txForm.name} onChange={(e) => setTxForm((s) => ({ ...s, name: e.target.value }))} placeholder="АТБ, Зарплата, Таксі…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Сума</label>
              <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" type="number" min="0.01" step="0.01" value={txForm.amount} onChange={(e) => setTxForm((s) => ({ ...s, amount: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Рахунок</label>
              <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={txForm.accountId} onChange={(e) => setTxForm((s) => ({ ...s, accountId: e.target.value }))}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Категорія <span className="font-normal normal-case opacity-70">(необов&apos;язково)</span>
            </label>
            <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={txForm.categoryId} onChange={(e) => setTxForm((s) => ({ ...s, categoryId: e.target.value }))}>
              <option value="">— Без категорії —</option>
              {db.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent} → {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Примітка</label>
            <textarea className="min-h-[84px] w-full rounded-md border bg-transparent px-3 py-2 text-sm" value={txForm.note} onChange={(e) => setTxForm((s) => ({ ...s, note: e.target.value }))} placeholder="Необов'язково…" />
          </div>
        </div>
      </FinanceDialog>

      <FinanceDialog
        open={transferDialog !== null}
        title={transferDialog?.mode === "edit" ? "Редагувати переказ" : "Переказ між рахунками"}
        onClose={() => setTransferDialog(null)}
        footer={
          <>
            <button className="rounded-md border px-4 py-2 text-sm hover:bg-accent" onClick={() => setTransferDialog(null)}>
              Скасувати
            </button>
            <button
              className="rounded-md bg-[var(--accent-ui)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              onClick={() => {
                const amount = Number(trForm.amount)
                if (!(amount > 0)) return alert("Сума має бути більше 0")
                const fromId = Number(trForm.fromAccountId) as Id
                const toId = Number(trForm.toAccountId) as Id
                if (!fromId || !toId) return alert("Оберіть рахунки")
                if (fromId === toId) return alert("Рахунки мають бути різними")

                if (transferDialog?.mode === "edit" && transferToEdit) {
                  editTransfer(transferDialog.transferId, {
                    date: trForm.date,
                    fromAccountId: fromId,
                    toAccountId: toId,
                    amount,
                    note: trForm.note.trim(),
                  })
                } else {
                  addTransfer({
                    date: trForm.date,
                    fromAccountId: fromId,
                    toAccountId: toId,
                    amount,
                    note: trForm.note.trim(),
                  })
                }
                setTransferDialog(null)
              }}
            >
              Зберегти
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Дата</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" type="date" value={trForm.date} onChange={(e) => setTrForm((s) => ({ ...s, date: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">З рахунку</label>
              <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={trForm.fromAccountId} onChange={(e) => setTrForm((s) => ({ ...s, fromAccountId: e.target.value }))}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">На рахунок</label>
              <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={trForm.toAccountId} onChange={(e) => setTrForm((s) => ({ ...s, toAccountId: e.target.value }))}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Сума</label>
            <input className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" type="number" min="0.01" step="0.01" value={trForm.amount} onChange={(e) => setTrForm((s) => ({ ...s, amount: e.target.value }))} />
            {trForm.fromAccountId === trForm.toAccountId && (
              <div className="mt-2 text-xs font-medium text-[var(--red)]">Рахунки мають бути різними</div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Примітка</label>
            <textarea className="min-h-[84px] w-full rounded-md border bg-transparent px-3 py-2 text-sm" value={trForm.note} onChange={(e) => setTrForm((s) => ({ ...s, note: e.target.value }))} placeholder="Необов'язково…" />
          </div>
        </div>
      </FinanceDialog>
    </div>
  )
}

