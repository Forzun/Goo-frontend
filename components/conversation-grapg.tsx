"use client"

import { useEffect, useRef, useState } from "react"
import ForceGraph2D, {
  type ForceGraphMethods,
  type GraphData,
} from "react-force-graph-2d"

import { cn } from "@/lib/utils"
import type {
  ConversationGraphData,
  ConversationGraphNode,
} from "@/types/graph"

interface ConversationGraphProps {
  data: ConversationGraphData
  onNodeClick?: (node: ConversationGraphNode) => void
  className?: string
}

function nodeLabel(node: ConversationGraphNode): string {
  if (node.kind === "project") {
    return `${node.name} · ${node.val} conversation${node.val === 1 ? "" : "s"}`
  }

  return `${node.name} · ${node.messageCount ?? 0} message${
    node.messageCount === 1 ? "" : "s"
  }`
}

export function ConversationGraph({
  data,
  onNodeClick,
  className,
}: ConversationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current

    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect

      setSize({ width, height })
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl border border-neutral-800 bg-[#121212]",
        className
      )}
    >
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={data as GraphData}
          backgroundColor="#121212"
          nodeColor={(node) =>
            (node as ConversationGraphNode).kind === "project"
              ? "#4fa8f0"
              : "#FF6D00"
          }
          nodeLabel={(node) => nodeLabel(node as ConversationGraphNode)}
          nodeVal={(node) =>
            Math.min(10, Math.max(1, (node as ConversationGraphNode).val))
          }
          nodeRelSize={5}
          linkColor={() => "#404040"}
          linkWidth={1}
          enableNodeDrag
          cooldownTicks={120}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
          onNodeClick={(node) =>
            onNodeClick?.(node as ConversationGraphNode)
          }
        />
      ) : null}
    </div>
  )
}
