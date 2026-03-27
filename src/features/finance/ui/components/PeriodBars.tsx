"use client"

import { monthLabelUa } from "@/features/finance/utils"

export function MonthPeriodBar({
  monthKey,
  onPrev,
  onNext,
  onToday,
}: {
  monthKey: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-4 py-3 shadow-sm">
      <button
        className="h-9 w-9 rounded-md border text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
        onClick={onPrev}
      >
        ‹
      </button>
      <div className="min-w-[220px] text-center font-semibold">
        <span className="font-serif text-lg">{monthLabelUa(monthKey)}</span>
      </div>
      <button
        className="h-9 w-9 rounded-md border text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
        onClick={onNext}
      >
        ›
      </button>
      <button
        className="ml-2 rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
        onClick={onToday}
      >
        Поточний
      </button>
    </div>
  )
}

export function YearPeriodBar({
  year,
  onPrev,
  onNext,
  onThisYear,
}: {
  year: number
  onPrev: () => void
  onNext: () => void
  onThisYear: () => void
}) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-4 py-3 shadow-sm">
      <button
        className="h-9 w-9 rounded-md border text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
        onClick={onPrev}
      >
        ‹
      </button>
      <div className="min-w-[120px] text-center">
        <span className="font-serif text-lg font-semibold">{year}</span>
      </div>
      <button
        className="h-9 w-9 rounded-md border text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
        onClick={onNext}
      >
        ›
      </button>
      <button
        className="ml-2 rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
        onClick={onThisYear}
      >
        Цей рік
      </button>
    </div>
  )
}

