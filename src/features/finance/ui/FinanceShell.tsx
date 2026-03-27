"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

import { exportCsv, exportJson, exportXls } from "@/features/finance/export"
import { type FinanceState, useFinanceStore } from "@/features/finance/store"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </Link>
  )
}

function Toast() {
  const toast = useFinanceStore((s: FinanceState) => s.toast)
  const clear = useFinanceStore((s: FinanceState) => s.setView) // noop use to avoid extra action; we clear locally
  // Simple auto-hide via nonce change
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => {
      // zustand doesn't have clearToast action yet, so we reset by setting toast=null via setState
      useFinanceStore.setState({ toast: null })
    }, 2600)
    return () => window.clearTimeout(t)
  }, [toast, clear])

  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 z-[1000] rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">
      {toast.message}
    </div>
  )
}

export function FinanceShell({ children }: { children: React.ReactNode }) {
  const db = useFinanceStore((s: FinanceState) => s.db)
  const resetDb = useFinanceStore((s: FinanceState) => s.resetDb)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="w-64 border-r px-4 py-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">💰 Фінанси</div>
              <div className="text-xs text-muted-foreground">Особистий облік</div>
            </div>
            <ModeToggle />
          </div>

          <div className="space-y-1">
            <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Огляд
            </div>
            <NavItem href="/finance/dashboard" label="📊 Дашборд" />

            <div className="px-3 pt-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Облік
            </div>
            <NavItem href="/finance/transactions" label="↕️ Транзакції" />
            <NavItem href="/finance/accounts" label="🏦 Рахунки" />
            <NavItem href="/finance/categories" label="🏷️ Категорії" />

            <div className="px-3 pt-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Звіти
            </div>
            <NavItem href="/finance/analytics" label="📈 Аналітика" />
          </div>

          <div className="mt-8 space-y-2 border-t pt-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                className="rounded-md border px-2 py-2 text-xs hover:bg-accent"
                onClick={() => exportJson(db)}
              >
                JSON
              </button>
              <button
                className="rounded-md border px-2 py-2 text-xs hover:bg-accent"
                onClick={() => exportCsv(db)}
              >
                CSV
              </button>
              <button
                className="rounded-md border px-2 py-2 text-xs hover:bg-accent"
                onClick={() => exportXls(db)}
              >
                Excel
              </button>
            </div>
            <button
              className="w-full rounded-md border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                if (confirm("Скинути дані до дефолтних?")) resetDb()
              }}
            >
              Скинути дані
            </button>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
      <Toast />
    </div>
  )
}

