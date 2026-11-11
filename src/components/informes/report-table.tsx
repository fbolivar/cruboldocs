import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import type { ReportResult } from "@/lib/bi/compute"

export function ReportTable({ result }: { result: ReportResult }) {
  if (result.rows.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <Tr>{result.columns.map((c) => <Th key={c.field}>{c.label}</Th>)}</Tr>
        </THead>
        <tbody>
          {result.rows.map((row, i) => (
            <Tr key={i}>
              {result.columns.map((c) => {
                const v = row[c.field]
                return <Td key={c.field}>{v === null || v === undefined || v === "" ? "—" : String(v)}</Td>
              })}
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
