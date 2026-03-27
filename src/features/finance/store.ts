"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import { buildDefaultDb } from "@/features/finance/defaultDb"
import type { Account, Category, FinanceDb, Id, Transaction, TxType } from "@/features/finance/types"
import { FIN_STORAGE_KEY, accName, monthKeyFromDate, todayIso } from "@/features/finance/utils"

export type FinanceView = "dashboard" | "transactions" | "accounts" | "categories" | "analytics"

export type TxFilters = {
  type: "" | "income" | "expense" | "transfer"
  accountId: "" | Id
  categoryId: "" | Id
  parent: "" | string
}

export type FinanceUiState = {
  view: FinanceView
  activeMonth: string // YYYY-MM
  activeYear: number

  calDate: string // YYYY-MM-01 (зберігаємо як string для persist)
  selDay: string | null // YYYY-MM-DD
  selMonth: boolean

  filters: TxFilters
}

export type FinanceActions = {
  // navigation / period
  setView: (view: FinanceView) => void
  shiftActiveMonth: (delta: number) => void
  goTodayMonth: () => void
  shiftActiveYear: (delta: number) => void
  goThisYear: () => void

  // calendar
  calendarShiftMonth: (delta: number) => void
  calendarToggleDay: (dayIso: string) => void
  calendarToggleMonth: () => void
  calendarClear: () => void

  // filters
  setFilter: <K extends keyof TxFilters>(key: K, value: TxFilters[K]) => void
  resetFilters: () => void

  // db
  resetDb: () => void
  addAccount: (input: Omit<Account, "id" | "num">) => void
  editAccount: (id: Id, patch: Partial<Omit<Account, "id" | "num">>) => void
  deleteAccount: (id: Id) => void

  addCategory: (input: Omit<Category, "id" | "num">) => void
  editCategory: (id: Id, patch: Partial<Omit<Category, "id" | "num">>) => void
  deleteCategory: (id: Id) => void

  addTransaction: (input: Omit<Transaction, "id" | "num" | "transferId"> & { transferId?: null }) => void
  editTransaction: (id: Id, patch: Partial<Omit<Transaction, "id" | "num">>) => void
  deleteTransaction: (id: Id) => void

  addTransfer: (input: { date: string; fromAccountId: Id; toAccountId: Id; amount: number; note: string }) => void
  editTransfer: (transferId: string, input: { date: string; fromAccountId: Id; toAccountId: Id; amount: number; note: string }) => void
  deleteTransfer: (transferId: string) => void
}

export type FinanceState = {
  db: FinanceDb
  ui: FinanceUiState
  toast: { message: string; nonce: number } | null
} & FinanceActions

function nextId(db: FinanceDb, kind: keyof FinanceDb["nid"]): number {
  const id = db.nid[kind]
  db.nid[kind] = id + 1
  return id
}

function nextNum(items: Array<{ num: number }>): number {
  return items.length ? Math.max(...items.map((x) => x.num)) + 1 : 1
}

function normalizeDb(db: FinanceDb): FinanceDb {
  // migrate old data: ensure transferId exists
  db.transactions.forEach((t) => {
    if ((t as any).transferId === undefined) (t as any).transferId = null
  })
  return db
}

function initialUi(): FinanceUiState {
  const now = new Date()
  const activeMonth = monthKeyFromDate(now)
  const activeYear = now.getFullYear()
  const calDate = `${activeMonth}-01`

  return {
    view: "dashboard",
    activeMonth,
    activeYear,
    calDate,
    selDay: null,
    selMonth: false,
    filters: { type: "", accountId: "", categoryId: "", parent: "" },
  }
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      db: normalizeDb(buildDefaultDb()),
      ui: initialUi(),
      toast: null,

      setView: (view) =>
        set((s) => ({
          ui: { ...s.ui, view, selDay: null, selMonth: false },
        })),

      shiftActiveMonth: (delta) =>
        set((s) => {
          const [yS, mS] = s.ui.activeMonth.split("-")
          const y = Number(yS)
          const m = Number(mS)
          const nd = new Date(y, m - 1 + delta, 1)
          return { ui: { ...s.ui, activeMonth: monthKeyFromDate(nd) } }
        }),

      goTodayMonth: () =>
        set((s) => ({ ui: { ...s.ui, activeMonth: monthKeyFromDate(new Date()) } })),

      shiftActiveYear: (delta) => set((s) => ({ ui: { ...s.ui, activeYear: s.ui.activeYear + delta } })),
      goThisYear: () => set((s) => ({ ui: { ...s.ui, activeYear: new Date().getFullYear() } })),

      calendarShiftMonth: (delta) =>
        set((s) => {
          const [yS, mS] = s.ui.calDate.split("-")
          const y = Number(yS)
          const m = Number(mS)
          const nd = new Date(y, m - 1 + delta, 1)
          const calDate = `${monthKeyFromDate(nd)}-01`
          return { ui: { ...s.ui, calDate, selDay: null, selMonth: false } }
        }),

      calendarToggleDay: (dayIso) =>
        set((s) => ({
          ui: {
            ...s.ui,
            selDay: s.ui.selDay === dayIso ? null : dayIso,
            selMonth: false,
          },
        })),

      calendarToggleMonth: () =>
        set((s) => ({
          ui: { ...s.ui, selDay: null, selMonth: !s.ui.selMonth },
        })),

      calendarClear: () => set((s) => ({ ui: { ...s.ui, selDay: null, selMonth: false } })),

      setFilter: (key, value) =>
        set((s) => {
          const next: TxFilters = { ...s.ui.filters, [key]: value } as any
          if (key === "parent") next.categoryId = ""
          return { ui: { ...s.ui, filters: next } }
        }),

      resetFilters: () => set((s) => ({ ui: { ...s.ui, filters: { type: "", accountId: "", categoryId: "", parent: "" } } })),

      resetDb: () =>
        set(() => ({
          db: normalizeDb(buildDefaultDb()),
          ui: initialUi(),
          toast: { message: "Базу скинуто ✓", nonce: Date.now() },
        })),

      addAccount: (input) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.accounts.push({
            id: nextId(db, "accounts"),
            num: nextNum(db.accounts),
            ...input,
          })
          return { db, toast: { message: "Рахунок додано ✓", nonce: Date.now() } }
        }),

      editAccount: (id, patch) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          const a = db.accounts.find((x) => x.id === id)
          if (!a) return s
          Object.assign(a, patch)
          return { db, toast: { message: "Збережено ✓", nonce: Date.now() } }
        }),

      deleteAccount: (id) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.accounts = db.accounts.filter((a) => a.id !== id)
          // як у старій версії: транзакції не чистимо автоматично (щоб не втратити дані непомітно)
          return { db, toast: { message: "Рахунок видалено", nonce: Date.now() } }
        }),

      addCategory: (input) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.categories.push({
            id: nextId(db, "categories"),
            num: nextNum(db.categories),
            ...input,
          })
          return { db, toast: { message: "Категорію додано ✓", nonce: Date.now() } }
        }),

      editCategory: (id, patch) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          const c = db.categories.find((x) => x.id === id)
          if (!c) return s
          Object.assign(c, patch)
          return { db, toast: { message: "Збережено ✓", nonce: Date.now() } }
        }),

      deleteCategory: (id) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.categories = db.categories.filter((c) => c.id !== id)
          return { db, toast: { message: "Категорію видалено", nonce: Date.now() } }
        }),

      addTransaction: (input) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.transactions.push({
            id: nextId(db, "transactions"),
            num: nextNum(db.transactions),
            transferId: null,
            ...input,
          })
          return { db, toast: { message: "Транзакцію додано ✓", nonce: Date.now() } }
        }),

      editTransaction: (id, patch) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          const t = db.transactions.find((x) => x.id === id)
          if (!t) return s
          Object.assign(t, patch)
          return { db, toast: { message: "Збережено ✓", nonce: Date.now() } }
        }),

      deleteTransaction: (id) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.transactions = db.transactions.filter((t) => t.id !== id)
          return { db, toast: { message: "Видалено", nonce: Date.now() } }
        }),

      addTransfer: ({ amount, date, fromAccountId, toAccountId, note }) =>
        set((s) => {
          if (fromAccountId === toAccountId) return { toast: { message: "Оберіть різні рахунки", nonce: Date.now() } } as any
          const db: FinanceDb = structuredClone(s.db)
          const tid = `tr_${Date.now()}`

          const baseNum = nextNum(db.transactions)
          db.transactions.push({
            id: nextId(db, "transactions"),
            num: baseNum,
            date,
            name: `Переказ → ${accName(db, toAccountId)}`,
            amount,
            type: "expense",
            accountId: fromAccountId,
            categoryId: null,
            note,
            transferId: tid,
          })
          db.transactions.push({
            id: nextId(db, "transactions"),
            num: baseNum + 1,
            date,
            name: `Переказ ← ${accName(db, fromAccountId)}`,
            amount,
            type: "income",
            accountId: toAccountId,
            categoryId: null,
            note,
            transferId: tid,
          })
          return { db, toast: { message: "Переказ виконано ✓", nonce: Date.now() } }
        }),

      editTransfer: (transferId, { amount, date, fromAccountId, toAccountId, note }) =>
        set((s) => {
          if (fromAccountId === toAccountId) return { toast: { message: "Оберіть різні рахунки", nonce: Date.now() } } as any
          const db: FinanceDb = structuredClone(s.db)
          const pair = db.transactions.filter((t) => t.transferId === transferId)
          const from = pair.find((t) => t.type === "expense")
          const to = pair.find((t) => t.type === "income")
          if (!from || !to) return s

          Object.assign(from, {
            date,
            amount,
            accountId: fromAccountId,
            name: `Переказ → ${accName(db, toAccountId)}`,
            note,
          } satisfies Partial<Transaction>)
          Object.assign(to, {
            date,
            amount,
            accountId: toAccountId,
            name: `Переказ ← ${accName(db, fromAccountId)}`,
            note,
          } satisfies Partial<Transaction>)

          return { db, toast: { message: "Переказ оновлено ✓", nonce: Date.now() } }
        }),

      deleteTransfer: (transferId) =>
        set((s) => {
          const db: FinanceDb = structuredClone(s.db)
          db.transactions = db.transactions.filter((t) => t.transferId !== transferId)
          return { db, toast: { message: "Переказ видалено", nonce: Date.now() } }
        }),
    }),
    {
      name: FIN_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ db: s.db, ui: s.ui }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.db = normalizeDb(state.db)

        // старий UI міг бути не ініціалізований — підстрахуємось
        if (!state.ui?.activeMonth) {
          const now = new Date()
          state.ui = { ...initialUi(), activeMonth: monthKeyFromDate(now), activeYear: now.getFullYear() }
        }

        // якщо calDate пошкоджений — ставимо на поточний
        if (!state.ui.calDate || state.ui.calDate.split("-").length < 3) {
          state.ui.calDate = `${monthKeyFromDate(new Date())}-01`
        }

        // якщо в базі нема nid — відновити приблизно
        if (!state.db.nid) {
          state.db.nid = {
            accounts: Math.max(1, ...state.db.accounts.map((a) => a.id)) + 1,
            categories: Math.max(1, ...state.db.categories.map((c) => c.id)) + 1,
            transactions: Math.max(1, ...state.db.transactions.map((t) => t.id)) + 1,
          }
        }

        // ensure date strings exist
        state.db.transactions.forEach((t) => {
          if (!t.date) t.date = todayIso()
        })
      },
    }
  )
)

