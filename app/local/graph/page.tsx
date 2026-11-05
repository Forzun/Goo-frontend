"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { workspaceService } from "@/features/workspace/workspace-service"
import type {
  ConversationGraphData,
  ConversationGraphNode,
} from "@/types/graph"

const ConversationGraph = dynamic(
  () =>
    import("@/components/conversation-grapg").then(
      (mod) => mod.ConversationGraph
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-xl border border-neutral-800 text-sm text-neutral-500">
        Loading graph…
      </div>
    ),
  }
)

const EMPTY_GRAPH: ConversationGraphData = { nodes: [], links: [] }

export default function GraphPage() {
  const router = useRouter()
  const data = useMemo<ConversationGraphData>(() => {
    try {
      return workspaceService.getConversationGraph()
    } catch {
      return EMPTY_GRAPH
    }
  }, [])

  const handleNodeClick = (node: ConversationGraphNode) => {
    if (node.kind === "conversation") {
      router.push(`/local/chat/${node.id}`)
    }
  }

  return (
    <main className="flex h-full min-h-[32rem] flex-col gap-4 p-4 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Conversation graph
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Projects and the conversations inside them. Click a conversation to
            open it.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#4fa8f0]" />
            Project
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#FF6D00]" />
            Conversation
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {data.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-neutral-800 text-sm text-neutral-500">
            No projects or conversations yet.
          </div>
        ) : (
          <ConversationGraph data={data} onNodeClick={handleNodeClick} />
        )}
      </div>
    </main>
  )
}
