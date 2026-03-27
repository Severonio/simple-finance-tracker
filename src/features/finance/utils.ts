import type { Account, Currency, FinanceDb, Id, Transaction } from "@/features/finance/types"

export const FIN_STORAGE_KEY = "fin_v4" as const

export function currencySymbol(curr: Currency): string {
  return (
    {
      UAH: "₴",
      USD: "$",
      EUR: "€",
      PLN: "zł",
    }[curr] ?? curr
  )
}

export function formatMoney(
  amount: number,
  curr: Currency | undefined,
  locale = "uk-UA"
): string {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(abs)
  return `${formatted} ${currencySymbol(curr ?? "UAH")}`
}

export function formatDateUa(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return "—"
  return `${d}.${m}.${y}`
}

export function todayIso(now = new Date()): string {
  return now.toISOString().split("T")[0] ?? ""
}

export function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function monthLabelUa(monthKey: string): string {
  const [yS, mS] = monthKey.split("-")
  const y = Number(yS)
  const m = Number(mS)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleString("uk-UA", { month: "long", year: "numeric" })
}

export function yearLabelUa(year: number): string {
  return String(year)
}

export function accById(db: FinanceDb, id: Id): Account | undefined {
  return db.accounts.find((a) => a.id === id)
}

export function accName(db: FinanceDb, id: Id): string {
  return accById(db, id)?.name ?? "—"
}

export function accCurrency(db: FinanceDb, id: Id): Currency {
  return accById(db, id)?.currency ?? "UAH"
}

export function categoryName(db: FinanceDb, id: Id | null): string {
  if (!id) return "—"
  return db.categories.find((c) => c.id === id)?.name ?? "—"
}

export function categoryParent(db: FinanceDb, id: Id | null): string {
  if (!id) return ""
  return db.categories.find((c) => c.id === id)?.parent ?? ""
}

// Balance: only income/expense affect balance; transfers are represented as paired income+expense
export function accountBalance(db: FinanceDb, accId: Id): number {
  const acc = accById(db, accId)
  if (!acc) return 0
  return db.transactions
    .filter((t) => t.accountId === accId)
    .reduce((sum, t) => {
      if (t.type === "income") return sum + t.amount
      if (t.type === "expense") return sum - t.amount
      return sum
    }, acc.initialBalance)
}

export function realIncome(txs: Transaction[]): number {
  return txs
    .filter((t) => t.type === "income" && !t.transferId)
    .reduce((s, t) => s + t.amount, 0)
}

export function realExpense(txs: Transaction[]): number {
  return txs
    .filter((t) => t.type === "expense" && !t.transferId)
    .reduce((s, t) => s + t.amount, 0)
}

export function monthTransactions(db: FinanceDb, monthKey: string): Transaction[] {
  return db.transactions.filter((t) => t.date && t.date.startsWith(monthKey))
}

export type TransferRow = {
  _kind: "transfer"
  transferId: string
  date: string
  amount: number
  note: string
  from: Transaction // expense
  to: Transaction // income
}

export type TxRow =
  | ({ _kind: "tx" } & Transaction)
  | TransferRow

export function buildRows(db: FinanceDb, txs: Transaction[]): TxRow[] {
  const seen = new Set<string>()
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))
  const rows: TxRow[] = []

  for (const t of sorted) {
    if (t.transferId) {
      if (seen.has(t.transferId)) continue
      seen.add(t.transferId)

      const pair = db.transactions.filter((x) => x.transferId === t.transferId)
      const from = pair.find((x) => x.type === "expense")
      const to = pair.find((x) => x.type === "income")
      if (from && to) {
        rows.push({
          _kind: "transfer",
          transferId: t.transferId,
          date: t.date,
          amount: from.amount,
          note: from.note,
          from,
          to,
        })
      }
    } else {
      rows.push({ _kind: "tx", ...t })
    }
  }

  return rows
}

