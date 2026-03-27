import type { Metadata } from "next"

import { FinanceShell } from "@/features/finance/ui/FinanceShell"

export const metadata: Metadata = {
  title: "Фінанси",
  description: "Особистий фінансовий трекер",
}

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceShell>{children}</FinanceShell>
}

