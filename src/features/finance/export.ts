import type { FinanceDb, Transaction } from "@/features/finance/types"
import { accName, categoryName, categoryParent, todayIso } from "@/features/finance/utils"

function download(content: BlobPart, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJson(db: FinanceDb) {
  const name = `finances_${todayIso()}.json`
  download(JSON.stringify(db, null, 2), "application/json", name)
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function exportCsv(db: FinanceDb) {
  const header = [
    "Дата",
    "Назва",
    "Тип",
    "Сума",
    "Рахунок",
    "Категорія",
    "Батьківська категорія",
    "Примітка",
    "ID переказу",
  ]

  const rows = [header]

  db.transactions.forEach((t: Transaction) => {
    let type = t.type === "income" ? "Дохід" : "Витрата"
    if (t.transferId) {
      type = t.type === "expense" ? "Переказ (списання)" : "Переказ (зарахування)"
    }

    rows.push([
      t.date,
      csvEscape(t.name ?? ""),
      type,
      String(t.amount),
      accName(db, t.accountId),
      t.categoryId ? categoryName(db, t.categoryId) : "",
      t.categoryId ? categoryParent(db, t.categoryId) : "",
      csvEscape(t.note ?? ""),
      t.transferId ?? "",
    ])
  })

  const csv = rows.map((r) => r.join(",")).join("\n")
  // BOM, щоб Excel нормально читав UTF-8
  const name = `finances_${todayIso()}.csv`
  download("\uFEFF" + csv, "text/csv;charset=utf-8", name)
}

// Простий XML Spreadsheet 2003 (файл .xls, як у вашому старому коді)
export function exportXls(db: FinanceDb) {
  const rows: Array<Array<string | number>> = [
    ["Дата", "Назва", "Тип", "Сума", "Рахунок", "Категорія", "Група", "Примітка", "ID переказу"],
  ]

  db.transactions.forEach((t) => {
    let type = t.type === "income" ? "Дохід" : "Витрата"
    if (t.transferId) type = t.type === "expense" ? "Переказ (−)" : "Переказ (+)"

    rows.push([
      t.date,
      t.name ?? "",
      type,
      t.amount,
      accName(db, t.accountId),
      t.categoryId ? categoryName(db, t.categoryId) : "",
      t.categoryId ? categoryParent(db, t.categoryId) : "",
      t.note ?? "",
      t.transferId ?? "",
    ])
  })

  const esc = (s: string | number) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")

  let xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Worksheet ss:Name="Транзакції"><Table>`

  rows.forEach((row, ri) => {
    xml += `<Row>`
    row.forEach((cell, ci) => {
      const isNum = ri > 0 && ci === 3 && typeof cell === "number"
      xml += `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${esc(cell)}</Data></Cell>`
    })
    xml += `</Row>`
  })

  xml += `</Table></Worksheet></Workbook>`

  const name = `finances_${todayIso()}.xls`
  download(xml, "application/vnd.ms-excel", name)
}

