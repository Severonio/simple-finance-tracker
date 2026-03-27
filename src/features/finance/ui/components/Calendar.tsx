"use client"

import { useMemo } from "react"

import { cn } from "@/lib/utils"

function monthLabelFromIso(iso: string) {
  const [yS, mS] = iso.split("-")
  const y = Number(yS)
  const m = Number(mS)
  return new Date(y, m - 1, 1).toLocaleString("uk-UA", { month: "long", year: "numeric" })
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

function firstDayOffsetMon0(year: number, monthIndex0: number) {
  // JS: Sun=0..Sat=6; we need Mon=0..Sun=6
  const d = new Date(year, monthIndex0, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function FinanceCalendar({
  calDateIso,
  selectedDayIso,
  selectedMonth,
  activeDates,
  onPrevMonth,
  onNextMonth,
  onToggleMonth,
  onToggleDay,
}: {
  calDateIso: string // YYYY-MM-01
  selectedDayIso: string | null
  selectedMonth: boolean
  activeDates: Set<string>
  onPrevMonth: () => void
  onNextMonth: () => void
  onToggleMonth: () => void
  onToggleDay: (iso: string) => void
}) {
  const { year, monthIndex0, todayIso, monthLabel, cells } = useMemo(() => {
    const [yS, mS] = calDateIso.split("-")
    const year = Number(yS)
    const monthIndex0 = Number(mS) - 1
    const label = monthLabelFromIso(calDateIso)
    const dim = daysInMonth(year, monthIndex0)
    const offset = firstDayOffsetMon0(year, monthIndex0)
    const now = new Date()
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`

    const days: Array<{ iso: string; day: number; empty?: boolean }> = []
    for (let i = 0; i < offset; i++) days.push({ iso: `empty-${i}`, day: 0, empty: true })
    for (let day = 1; day <= dim; day++) {
      const iso = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      days.push({ iso, day })
    }
    return { year, monthIndex0, todayIso, monthLabel: label, cells: days }
  }, [calDateIso])

  const dns = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]

  return (
    <div className="mb-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          className={cn(
            "rounded-md px-2 py-1 font-serif text-base transition",
            selectedMonth && !selectedDayIso ? "bg-[var(--accent-soft)] text-[var(--accent-ui)]" : "hover:bg-[var(--bg)]"
          )}
          onClick={onToggleMonth}
          aria-label="Обрати місяць"
        >
          {monthLabel}
        </button>
        <div className="flex gap-2">
          <button
            className="h-9 w-9 rounded-md border text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
            onClick={onPrevMonth}
            aria-label="Попередній місяць"
          >
            ‹
          </button>
          <button
            className="h-9 w-9 rounded-md border text-muted-foreground hover:border-[var(--accent-ui)] hover:text-[var(--accent-ui)]"
            onClick={onNextMonth}
            aria-label="Наступний місяць"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dns.map((n) => (
          <div key={n} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {n}
          </div>
        ))}
        {cells.map((c) => {
          if (c.empty) return <div key={c.iso} className="h-10 rounded-md text-center text-muted-foreground/40" />

          const isToday = c.iso === todayIso
          const isSelected = selectedDayIso === c.iso
          const has = activeDates.has(c.iso)

          return (
            <button
              key={c.iso}
              onClick={() => onToggleDay(c.iso)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-md text-sm transition",
                "hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ui)]",
                isSelected && "bg-[var(--accent-ui)] text-white hover:bg-[var(--accent-ui)] hover:text-white"
              )}
            >
              <span className={cn(isToday && "font-semibold")}>{c.day}</span>
              {isToday && !isSelected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--accent-ui)]" />}
              {has && (
                <span
                  className={cn(
                    "absolute top-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-white/70" : "bg-[var(--green)]"
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

