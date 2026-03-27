"use client"

import { useEffect } from "react"

import { cn } from "@/lib/utils"

export function FinanceDialog({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  footer: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div className="font-serif text-lg font-semibold">{title}</div>
          <button
            className="h-9 w-9 rounded-md text-muted-foreground hover:bg-[var(--bg)]"
            onClick={onClose}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        <div className={cn("flex justify-end gap-2 border-t px-6 py-4")}>{footer}</div>
      </div>
    </div>
  )
}

