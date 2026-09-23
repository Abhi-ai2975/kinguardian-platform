import { useDynamicComponent } from "../hooks/use-dynamic-component"
import type { TableNode } from "../types"
import type { IMessageProcessor } from "../rendering/processor"
import {
  Table as ShadCNTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

interface TableProps {
  processor: IMessageProcessor
  surfaceId: string
  component: TableNode
  weight?: string | number
}

function resolveText(value: any) {
  if (typeof value === "object" && value?.literalString) {
    return value.literalString
  }
  if (typeof value === "boolean") {
    return value ? "✅ Yes" : "❌ No"
  }
  return value
}

export function Table({
  processor,
  surfaceId,
  component,
  weight = "initial"
}: TableProps) {
  const { theme } = useDynamicComponent(processor, surfaceId, component, weight)

  return (
    <div style={{ flex: weight, overflowX: "auto" }}>
      <ShadCNTable>
        <TableHeader>
          <TableRow>
            {component.properties.headers.map((header, index) => (
              <TableHead key={index}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {component.properties.data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{resolveText(cell)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </ShadCNTable>
    </div>
  )
}
