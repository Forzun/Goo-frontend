"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { GooFaceIcon } from "@/components/local/agents/goo-face-icon"
import { workspaceService } from "@/features/workspace/workspace-service"
import { pixel } from "@/app/page"
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
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-edge bg-[#0f0f0f] text-center">
        <GooFaceIcon className="size-8 text-text-primary" />
        <p className="text-sm text-text-muted">Mapping your workspace…</p>
      </div>
    ),
  }
)

const EMPTY_GRAPH: ConversationGraphData = { nodes: [], links: [] }

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-lg border border-edge bg-[#181819]/80 px-2.5 py-1">
      <span className="text-sm font-semibold text-text-primary">{value}</span>
      <span className="text-[10px] tracking-wider text-text-dim uppercase">
        {label}
      </span>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-[#181819]/80 px-2.5 py-1 text-[11px] text-text-muted">
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

export default function GraphPage() {
  const router = useRouter()
  const data = useMemo<ConversationGraphData>(() => {
    try {
      return workspaceService.getConversationGraph()
    } catch {
      return EMPTY_GRAPH
    }
  }, [])

  const stats = useMemo(() => {
    let projects = 0
    let conversations = 0
    let messages = 0

    for (const node of data.nodes) {
      if (node.kind === "project") {
        projects += 1
      } else {
        conversations += 1
      }

      messages += node.messageCount ?? 0
    }

    return { projects, conversations, messages }
  }, [data])

  const handleNodeClick = (node: ConversationGraphNode) => {
    if (node.kind === "conversation") {
      router.push(`/local/chat/${node.id}`)
    }
  }

  return (
    <main className="relative flex h-full min-h-[32rem] flex-col gap-4 overflow-hidden bg-main-bg p-4 text-text-primary sm:gap-5 sm:p-6">
      <header className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-edge bg-[#181819]">
            <GooFaceIcon className="size-6 text-text-primary" />
          </div>
          <div>
            <h1
              style={pixel}
              className="text-3xl font-normal tracking-tight sm:text-4xl"
            >
              Conversation Graph
            </h1>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-text-muted">
              Every project and conversation, mapped as one connected space.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Stat label="Projects" value={stats.projects} />
              <Stat label="Conversations" value={stats.conversations} />
              <Stat label="Messages" value={stats.messages} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <LegendItem color="#4fa8f0" label="Project" />
            <LegendItem color="#FF6D00" label="Conversation" />
          </div>
          <p className="text-[11px] text-text-dim">
            Click a conversation node to open it
          </p>
        </div>
      </header>

      <section className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-edge bg-[#0f0f0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {data.nodes.length === 0 ? (
          <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <GooFaceIcon className="size-10 text-text-dim" />
            <p className="text-sm text-text-muted">
              No conversations mapped yet.
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-text-dim">
              Create a project and start chatting to see your graph grow.
            </p>
          </div>
        ) : (
          <ConversationGraph
            data={data}
            onNodeClick={handleNodeClick}
            className="relative rounded-none border-0"
          />
        )}

        {data.nodes.length > 0 ? (
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/5 bg-black/40 px-3 py-1 text-[10px] text-text-muted backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#FF6D00]" />
            Drag to arrange · Scroll to zoom
          </div>
        ) : null}
      </section>
    </main>
  )
}
