import { useDynamicComponent } from "../hooks/use-dynamic-component"
import type { CardNode } from "../types"
import type { IMessageProcessor } from "../rendering/processor"
import { Renderer } from "../rendering/renderer"
import { Card as ShadCNCard } from "@/components/ui/card"

interface CardProps {
  processor: IMessageProcessor
  surfaceId: string
  component: CardNode
  weight?: string | number
}

export function Card({
  processor,
  surfaceId,
  component,
  weight = "initial"
}: CardProps) {
  const { theme } = useDynamicComponent(processor, surfaceId, component, weight)

  return (
    <ShadCNCard className="p-4" style={{ flex: weight }}>
      {component.properties?.child && (
        <Renderer
          processor={processor}
          surfaceId={surfaceId}
          component={component.properties.child}
        />
      )}
    </ShadCNCard>
  )
}
