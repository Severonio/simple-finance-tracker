export type Currency = "UAH" | "USD" | "EUR" | "PLN" | (string & {})

export type AccountType = "card" | "cash" | "deposit" | "currency" | (string & {})

export type TxType = "income" | "expense"

export type Id = number

export interface Account {
  id: Id
  num: number
  name: string
  type: AccountType
  currency: Currency
  initialBalance: number
}

export interface Category {
  id: Id
  num: number
  name: string
  parent: string
  budget: number
}

export interface Transaction {
  id: Id
  num: number
  date: string // YYYY-MM-DD
  name: string
  amount: number
  type: TxType
  accountId: Id
  categoryId: Id | null
  note: string
  transferId: string | null
}

export interface Nid {
  accounts: number
  categories: number
  transactions: number
}

export interface FinanceDb {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  nid: Nid
}

