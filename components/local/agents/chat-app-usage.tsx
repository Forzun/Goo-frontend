"use client"

import {
  Bot,
  Clock3,
  FolderKanban,
  MessageSquarePlus,
  PanelLeft,
  Paperclip,
  Search,
  User,
  WandSparkles,
} from "lucide-react"
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AISidebar,
  type SidebarResource,
} from "@/components/local/agents/ai-sidebar"
import {
  ApprovalCard,
  type ApprovalCardQuestion,
  type ApprovalCardStatus,
} from "@/components/local/agents/approval-card"
import { CodeBlock } from "@/components/local/agents/code-block"
import { ChatApp } from "@/components/local/agents/chat-app"
import { FileDiff } from "@/components/local/agents/file-diff"
import { ImageGeneration } from "@/components/local/agents/image-generation"
import { ThinkingShimmer } from "@/components/local/agents/loading-states"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/local/agents/message"
import {
  MessageBubble,
  MessageBubbleContent,
} from "@/components/local/agents/message-bubble"
import { MessageScroller } from "@/components/local/agents/message-scroller"
import {
  PromptInput,
  PromptModel,
} from "@/components/local/agents/prompt-input"
import { StreamingResponse } from "@/components/local/agents/streaming-response"
import { TodoList, type TodoItem } from "@/components/local/agents/todo-list"

import {
  ToolResult,
  ToolResultOutput,
} from "@/components/local/agents/tool-result"
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
} from "@/components/local/motion/animated-sidebar"
import { cn } from "@/lib/utils"
import { useFetchModels } from "@/hooks/use-models"
import { useResponse } from "@/hooks/use-response"
import { useParams, useRouter } from "next/navigation"
import ParsedMessage from "./parsed-message"
import { useWorkspace } from "@/hooks/use-workspace"
import { workspaceService } from "@/features/workspace/workspace-service"
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/local/motion/center-morph-modal"
import { Input } from "@/components/local/motion/input"
import { Button } from "@/components/local/motion/button"
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "../motion/animated-toast-stack"
export const pixel = { fontFamily: "var(--font-vt323), monospace" } as const
import { getDb } from "@/lib/sqlit/db"
import { ToolApprovalStatus } from "./tool-approval"
import { updateConversationMemory } from "@/lib/memory/update-memory"
import { EmbeddingRepository } from "@/lib/embedding/embedding-repository"
import { indexMarkdownMemory } from "@/lib/embedding/memory-embedding"

const resources: SidebarResource[] = [
  {
    id: "release",
    label: "Release workspace",
    kind: "project",
    children: [
      { id: "checkout", label: "Checkout audit", kind: "file" },
      { id: "release-notes", label: "Release notes", kind: "file" },
      { id: "references", label: "Research sources", kind: "bookmark" },
    ],
  },
  {
    id: "design",
    label: "Design system",
    kind: "folder",
    children: [
      { id: "tokens", label: "Motion tokens", kind: "file" },
      { id: "components", label: "Component inventory", kind: "file" },
    ],
  },
]

const diffLines = [
  {
    id: "context-1",
    type: "context" as const,
    oldLine: 41,
    newLine: 41,
    content: "  const total = subtotal + shipping;",
  },
  {
    id: "removed-1",
    type: "removed" as const,
    oldLine: 42,
    content: "  return submitOrder(total);",
  },
  {
    id: "added-1",
    type: "added" as const,
    newLine: 42,
    content: "  const result = validateOrder({ total, items });",
  },
  {
    id: "added-2",
    type: "added" as const,
    newLine: 43,
    content: "  return result.ok ? submitOrder(total) : result;",
  },
]

const approvalQuestions: ApprovalCardQuestion[] = [
  {
    id: "release",
    title: "How should the patch be released?",
    options: [
      { value: "focused", label: "Ship the focused checkout fix" },
      { value: "bundle", label: "Bundle it with the next release" },
    ],
    allowCustom: true,
    customPlaceholder: "Add another release instruction…",
  },
]

interface AddedMessage {
  id: string
  from: "user" | "assistant"
  content: string
  streaming?: boolean
}

function GeneratedPreview() {
  return (
    <svg viewBox="0 0 640 420" aria-hidden="true" className="size-full">
      <rect
        width="640"
        height="420"
        fill="currentColor"
        className="text-muted"
      />
      <rect
        x="64"
        y="52"
        width="512"
        height="316"
        rx="28"
        fill="currentColor"
        className="text-background"
      />
      <circle
        cx="320"
        cy="144"
        r="38"
        fill="currentColor"
        className="text-emerald-500"
      />
      <path
        d="m301 144 13 13 26-29"
        fill="none"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="204"
        y="210"
        width="232"
        height="18"
        rx="9"
        fill="currentColor"
        className="text-foreground/85"
      />
      <rect
        x="238"
        y="246"
        width="164"
        height="12"
        rx="6"
        fill="currentColor"
        className="text-muted-foreground/35"
      />
      <rect
        x="248"
        y="298"
        width="144"
        height="34"
        rx="17"
        fill="currentColor"
        className="text-foreground"
      />
    </svg>
  )
}

function AssistantIdentity({ label = "Goo" }: { label?: string }) {
  return (
    <MessageHeader>
      <span>{label}</span>
      <span>Now</span>
    </MessageHeader>
  )
}

export function ChatAppExample({
  className,
}: Pick<ComponentProps<typeof ChatApp>, "className">) {
  const router = useRouter()
  const toolTimers = useRef<number[]>([])
  const chatTimers = useRef<number[]>([])
  const approvalTimers = useRef<number[]>([])
  const runId = useRef(0)
  const [items, setItems] = useState<SidebarResource[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [activeReply, setActiveReply] = useState<string | null>(null)
  const [messages, setMessages] = useState<AddedMessage[]>([])
  const [toolStatus, setToolStatus] = useState<ToolApprovalStatus>("pending")
  const [model, setModel] = useState<string | null>()
  const [approvalStatus, setApprovalStatus] =
    useState<ApprovalCardStatus>("pending")
  const [projectResource, setProjectResource] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false)
  const [conversationName, setConversationName] = useState<string>("")
  const [loader, setLoader] = useState<boolean>(false)
  const [currentProject, setCurrentProject] = useState("")
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [projectName, setProjectName] = useState<string>("")
  const { showToast, toasts } = useAnimatedToastStack({
    defaultDuration: 3600,
    limit: 5,
  })

  // Custom hooks
  const { models } = useFetchModels()
  const { data, loading, streaming, error, send } = useResponse(model ?? "")
  const ws = useWorkspace()

  // The active child in the sidebar is whatever conversation the URL points
  // at (`/local/chat/[id]`); a project row is only ever the fallback.
  const params = useParams<{ id?: string }>()
  const activeConversationId = params?.id
  const activeResource = activeConversationId ?? projectResource
  const activeConversationRef = useRef<string | null>(null)

  const filterConversation = ws.conversations

  const clearToolTimers = useCallback(() => {
    toolTimers.current.forEach(window.clearTimeout)
    toolTimers.current = []
  }, [])

  const clearChatTimers = useCallback(() => {
    chatTimers.current.forEach(window.clearTimeout)
    chatTimers.current = []
  }, [])

  const clearApprovalTimers = useCallback(() => {
    approvalTimers.current.forEach(window.clearTimeout)
    approvalTimers.current = []
  }, [])

  useEffect(
    () => () => {
      clearToolTimers()
      clearChatTimers()
      clearApprovalTimers()
    },
    [clearApprovalTimers, clearChatTimers, clearToolTimers, models]
  )

  const plan = useMemo<TodoItem[]>(() => {
    const checksStatus =
      toolStatus === "complete"
        ? "completed"
        : toolStatus === "running"
          ? "in-progress"
          : toolStatus === "denied" || toolStatus === "error"
            ? "cancelled"
            : "pending"
    return [
      {
        id: "inspect",
        title: "Inspect the checkout flow",
        status: "completed",
      },
      {
        id: "patch",
        title: "Prepare the validation patch",
        status: "completed",
      },
      { id: "checks", title: "Run focused checks", status: checksStatus },
      {
        id: "review",
        title: "Collect release approval",
        status: toolStatus === "complete" ? "in-progress" : "pending",
      },
    ]
  }, [toolStatus])

  const approveTool = () => {
    clearToolTimers()
    setToolStatus("approving")
    toolTimers.current = [
      window.setTimeout(() => setToolStatus("approved"), 450),
      window.setTimeout(() => setToolStatus("running"), 850),
      window.setTimeout(() => setToolStatus("complete"), 1650),
    ]
  }

  const submit = async (value: string) => {
    if (!value.trim() || pending || activeReply) return
    const id = runId.current++
    const assistantId = `assistant-${id}`
    setMessages((current) => [
      ...current,
      { id: `user-${id}`, from: "user", content: value },
      { id: assistantId, from: "assistant", content: "", streaming: true },
    ])
    setInput("")
    setPending(true)
    setActiveReply(assistantId)

    // Remember which conversation this turn belongs to so both the prompt and
    // the streamed reply land there even if the user switches children.
    activeConversationRef.current = activeConversationId ?? null
    if (activeConversationRef.current) {
      workspaceService
        .appendMessage(activeConversationRef.current, "user", value)
        .catch(() => {
          showToast({
            status: "error",
            title: "Couldn't save the message",
            duration: 1501,
          })
        })
    }

    send(value)
  }

  // Sync streamed data into the active assistant message
  useEffect(() => {
    if (!activeReply) return

    async function message() {
      setMessages((current) =>
        current.map((m) =>
          m.id === activeReply
            ? { ...m, content: error ? error.message : (data ?? "") }
            : m
        )
      )
    }

    message()
  }, [data, error, activeReply])

  // set Project and Conversations
  useEffect(() => {
    if (!ws.projects?.length) return

    const newItems = ws.projects.map((p) => ({
      id: p.id,
      kind: "project" as const,
      label: p.name,
      children: [
        ...ws.conversations
          .filter((c) => c.projectId === p.id)
          .map((con) => ({
            id: con.id,
            label: con.title,
            kind: "file" as const,
          })),
        {
          id: `create-conversation-${p.id}`,
          label: "New Conversation",
          kind: "action" as const,
        },
      ],
    }))

    setItems(newItems)
  }, [ws.projects, ws.activeProjectId, ws.conversations])

  // Load the conversation the route points at, so switching children in the
  // sidebar swaps the chat instead of showing the previous one.
  // Note: this must not touch `activeConversationRef` — that tracks which
  // conversation owns the in-flight turn, even if the route moves on.
  useEffect(() => {
    if (!activeConversationId) return

    let cancelled = false

    async function initDb() {
      const db = await getDb()
      const repository = new EmbeddingRepository(db)
      const message = db.exec(
        `SELECT id, source_type, source_path, model, dimension, length(embedding) AS embedding_bytes FROM embeddings`
      )
      const embeddings = db.exec(`SELECT * FROM embeddings`)
      console.log(embeddings)
    }

    initDb()
    workspaceService
      .getConversation(activeConversationId)
      .then(({ data }) => {
        if (cancelled) return
        setActiveTitle(data.title)
        setMessages(
          data.messages.flatMap((m) =>
            m.role === "system"
              ? []
              : [
                  {
                    id: m.id,
                    from: m.role,
                    content: m.content,
                    streaming: false,
                  },
                ]
          )
        )
      })
      .catch(() => {
        if (cancelled) return
        setActiveTitle(null)
        setMessages([])
      })

    return () => {
      cancelled = true
    }
  }, [activeConversationId])

  // When loading finishes (entire stream is done), mark message complete
  useEffect(() => {
    async function message() {
      if (loading || !activeReply) return

      setMessages((current) =>
        current.map((m) =>
          m.id === activeReply ? { ...m, streaming: false } : m
        )
      )
      setPending(false)
      setActiveReply(null)

      // Save the reply to the conversation it was asked in — that may no
      // longer be the one on screen if the user switched children mid-stream.
      const target = activeConversationRef.current
      const reply = error ? null : data
      if (target && reply) {
        const saved = await workspaceService
          .appendMessage(target, "assistant", reply)
          .then(() => true)
          .catch(() => {
            showToast({
              status: "error",
              title: "Couldn't save the reply",
              duration: 1501,
            })
            return false
          })

        const memoryModel = model ?? models?.[0]?.name
        if (saved && memoryModel) {
          updateConversationMemory(target, memoryModel).catch((error) => {
            console.error("Memory update failed:", error)
            showToast({
              status: "error",
              title: "Couldn't save the memory",
              duration: 1501,
            })
          })
        }
      }
    }
    message()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeReply])

  // async function testMemoryIndexing(conversationId: string) {
  //   const { conversation } =
  //     await workspaceService.getConversation(conversationId)

  //   const db = await getDb()
  //   const repository = new EmbeddingRepository(db)

  //   const result = await indexMarkdownMemory(
  //     workspaceService.fs,
  //     `${conversation.relativePath}/memory.md`,
  //     repository,
  //     "nomic-embed-text"
  //   )

  //   await workspaceService.persistDb()

  //   console.log("Indexing result:", result)

  //   console.log(
  //     "Embedding rows:",
  //     db.exec(
  //       "SELECT source_type, COUNT(*) FROM embeddings GROUP BY source_type"
  //     )
  //   )
  // }

  // testMemoryIndexing(activeConversationId!)

  const stop = () => {
    clearChatTimers()
    setPending(false)
    setMessages((current) =>
      current.map((message) =>
        message.streaming ? { ...message, streaming: false } : message
      )
    )
    setActiveReply(null)
  }

  const handleCreateConversation = async (name: string) => {
    setLoader(true)

    if (!name || name.trim().length === 0) {
      showToast({
        status: "error",
        title: "Conversation can't be empty",
        duration: 1501,
      })
      setShowNewConversationModal(false)
      setLoader(false)
      return
    }

    try {
      const newConversation = await ws.createConversation(
        currentProject,
        name.trim()
      )
      router.push(`/local/chat/${newConversation.id}`)
    } catch (error) {
      // console.log(activeResource)
      showToast({
        status: "error",
        title:
          "Failed to create conversation: " +
          (error instanceof Error ? error.message : String(error)),
        duration: 1501,
      })
    }

    setConversationName("")
    setShowNewConversationModal(false)
    setLoader(false)
  }

  const handleCreateProject = async (name: string) => {
    setLoader(true)

    if (!name || name.trim().length === 0) {
      showToast({
        status: "error",
        title: "Project can't be empty",
        duration: 1501,
      })
      setShowNewProjectModal(false)
      setLoader(false)
      return
    }

    try {
      await ws.createProject(name.trim())
    } catch (error) {
      showToast({
        status: "error",
        title:
          "Failed to create project: " +
          (error instanceof Error ? error.message : String(error)),
        duration: 1501,
      })
    }

    setProjectName("")
    setShowNewProjectModal(false)
    setLoader(false)
  }

  const busy = pending || activeReply !== null

  return (
    <ChatApp sidebarWidth="17rem" className={cn("h-screen", className)}>
      <AnimatedToastStack
        toasts={toasts}
        position="top-center"
        className="absolute top-10"
      />
      <AnimatedSidebar
        ariaLabel="Agent workspace"
        collapsible="offcanvas"
        className="min-h-0"
        panelClassName="h-full bg-sidebar text-secondary text-nav"
      >
        <AnimatedSidebarContent className="gap-4 overflow-hidden px-2 py-4">
          <AnimatedSidebarGroup className="shrink-0 px-1 py-0">
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu className="gap-1">
                {[
                  {
                    label: "New task",
                    icon: MessageSquarePlus,
                    active: true,
                    badge: (
                      <span className="flex justify-center gap-2 py-3">
                        <kbd className="inline-flex h-5 scale-130 items-center rounded border border-border/60 bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                          ⌘
                        </kbd>
                        <kbd className="inline-flex h-5 scale-130 items-center rounded border border-border/60 bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                          K
                        </kbd>
                      </span>
                    ),
                    action: () => setShowNewProjectModal(true),
                  },
                  { label: "Search", icon: Search },
                  { label: "Runs", icon: Clock3 },
                ].map(({ label, icon: Icon, active, badge, action }) => (
                  <AnimatedSidebarMenuItem key={label}>
                    <AnimatedSidebarMenuButton
                      isActive={active}
                      icon={<Icon className="size-4" />}
                      onSelect={() => action?.()}
                      className="font-normal"
                      badge={badge}
                    >
                      {label}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                ))}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>

          <AnimatedSidebarGroup className="min-h-0 flex-1 px-1 py-0">
            <AnimatedSidebarGroupLabel className="mb-1 h-8 px-2 text-xs font-medium tracking-normal normal-case">
              Projects
            </AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent className="relative min-h-0 flex-1 overflow-hidden">
              <div className="h-full [scrollbar-width:none] overflow-y-auto overscroll-contain pb-8 [overflow-anchor:none] [&::-webkit-scrollbar]:hidden">
                {items.length > 0 ? (
                  <AISidebar
                    items={items}
                    activeId={activeResource}
                    defaultExpandedIds={items.map((i) => i.id)}
                    onActiveChange={(id) => {
                      const project = items.find((p) => p.id == id)

                      if (project) {
                        ws.selectProject(id)
                        setProjectResource(id)
                        return
                      }

                      const conversationString = `create-conversation-`

                      if (id.includes(conversationString)) {
                        setCurrentProject(id.split("-")[2])
                        setShowNewConversationModal(true)
                        return
                      } else {
                        router.push(`/local/chat/${id}`)
                      }
                    }}
                    onItemsChange={setItems}
                  />
                ) : null}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent"
              />
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
        <AnimatedSidebarRail />
      </AnimatedSidebar>

      <AnimatedSidebarInset className="min-h-0 bg-main-bg text-body text-text-primary">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <AnimatedSidebarTrigger className="text-muted-foreground hover:bg-muted hover:text-foreground">
              <PanelLeft className="size-4" />
            </AnimatedSidebarTrigger>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {activeTitle ?? "New chat"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {activeTitle
                  ? "Agent workspace"
                  : "Pick a conversation to start"}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Connected
          </span>
        </header>

        <MessageScroller
          busy={busy}
          navigation="rail"
          className="min-h-0 flex-1"
          viewportClassName="px-3 py-5 sm:px-5"
          contentClassName="mx-auto min-h-full w-full max-w-3xl"
        >
          <MessageGroup spacing="default">
            {toolStatus === "running" || toolStatus === "complete" ? (
              <Message from="assistant" animateIn>
                <MessageAvatar placeholder />
                <MessageContent className="gap-3">
                  <ToolResult
                    tool="terminal.run"
                    title={
                      toolStatus === "running"
                        ? "Running checkout checks"
                        : "Checkout checks passed"
                    }
                    status={toolStatus === "running" ? "running" : "success"}
                    kind="terminal"
                    meta={toolStatus === "running" ? "Live" : "2.8s"}
                    defaultOpen
                    collapseOnComplete={false}
                  >
                    <ToolResultOutput>
                      {toolStatus === "running"
                        ? "✓ validation contract\n… checkout keyboard flow"
                        : "✓ validation contract\n✓ checkout keyboard flow\n✓ order submission recovery"}
                    </ToolResultOutput>
                  </ToolResult>
                  {toolStatus === "complete" ? (
                    <>
                      <FileDiff
                        file="checkout/submit.ts"
                        lines={diffLines}
                        status="complete"
                        defaultOpen
                        collapseOnComplete={false}
                      />
                      <CodeBlock
                        filename="validation.ts"
                        language="typescript"
                        status="complete"
                        code={
                          "export function validateOrder(order: Order) {\n  return schema.safeParse(order);\n}"
                        }
                        showLineNumbers
                      />
                    </>
                  ) : null}
                </MessageContent>
              </Message>
            ) : toolStatus === "denied" || toolStatus === "error" ? (
              <Message from="assistant" animateIn>
                <MessageAvatar placeholder />
                <MessageContent>
                  <ToolResult
                    tool="terminal.run"
                    title="Checkout checks were not run"
                    status={toolStatus === "denied" ? "cancelled" : "error"}
                    kind="terminal"
                    defaultOpen
                    collapseOnComplete={false}
                  >
                    <ToolResultOutput>
                      {toolStatus === "denied"
                        ? "Permission was not granted. No command was run."
                        : "The command could not be completed."}
                    </ToolResultOutput>
                  </ToolResult>
                </MessageContent>
              </Message>
            ) : null}

            {toolStatus === "complete" ? (
              <Message from="assistant" animateIn>
                <MessageAvatar placeholder />
                <MessageContent className="gap-3">
                  <ImageGeneration
                    status="complete"
                    prompt="a clear checkout confirmation screen"
                    resolution="1280 × 840"
                    size="compact"
                  >
                    <GeneratedPreview />
                  </ImageGeneration>
                  <MessageBubble variant="ghost" className="w-full">
                    <MessageBubbleContent>
                      <StreamingResponse
                        status="complete"
                        copyText="The checkout patch is ready for review."
                        sources={[
                          {
                            id: "message",
                            title: "Message composition",
                            domain: "beui.dev",
                            url: "/components/agents/message",
                          },
                          {
                            id: "diff",
                            title: "File Diff",
                            domain: "beui.dev",
                            url: "/components/agents/file-diff",
                          },
                          {
                            id: "approval",
                            title: "Tool Approval",
                            domain: "beui.dev",
                            url: "/components/agents/tool-approval",
                          },
                        ]}
                      >
                        <p>The checkout patch is ready for review.</p>
                        <ul>
                          <li>Validation now runs before submission.</li>
                          <li>Failure output stays inside the current flow.</li>
                          <li>
                            Focused checks pass without changing the layout.
                          </li>
                        </ul>
                      </StreamingResponse>
                    </MessageBubbleContent>
                  </MessageBubble>
                </MessageContent>
              </Message>
            ) : null}

            {toolStatus === "complete" ? (
              <Message from="assistant" animateIn>
                <MessageAvatar placeholder />
                <MessageContent>
                  <ApprovalCard
                    questions={approvalQuestions}
                    status={approvalStatus}
                    onSubmit={() => {
                      setApprovalStatus("submitting")
                      clearApprovalTimers()
                      approvalTimers.current.push(
                        window.setTimeout(
                          () => setApprovalStatus("answered"),
                          650
                        )
                      )
                    }}
                    result="Release direction sent to the agent."
                  />
                </MessageContent>
              </Message>
            ) : null}

            {messages.map((message) => (
              <Message key={message.id} from={message.from} animateIn>
                {message.from === "assistant" ? (
                  <MessageAvatar>
                    <span
                      style={{
                        ...pixel,
                        fontSize: "26px",
                        color: "#968d88",
                        lineHeight: 1,
                      }}
                    >
                      G
                    </span>
                    <Bot />
                  </MessageAvatar>
                ) : (
                  <MessageAvatar>
                    <User />
                  </MessageAvatar>
                )}
                <MessageContent>
                  {message.from === "assistant" ? (
                    <AssistantIdentity label="Local Agent" />
                  ) : null}
                  <MessageBubble
                    variant={message.from === "user" ? "solid" : "soft"}
                  >
                    <MessageBubbleContent>
                      {message.from === "assistant" ? (
                        message.streaming && !message.content ? (
                          <ThinkingShimmer>
                            Reviewing your direction
                          </ThinkingShimmer>
                        ) : (
                          <ParsedMessage
                            content={message.content}
                            streaming={message.streaming ?? true}
                            showActions={!message.streaming}
                          />
                        )
                      ) : (
                        message.content
                      )}
                    </MessageBubbleContent>
                  </MessageBubble>
                  {message.from === "user" ? (
                    <MessageFooter>Sent</MessageFooter>
                  ) : null}
                </MessageContent>
              </Message>
            ))}
          </MessageGroup>
        </MessageScroller>

        <div className="shrink-0 pb-3">
          <div className="mx-auto max-w-3xl">
            <PromptInput
              className="border-edge text-placeholder border bg-input-bg text-body"
              value={input}
              onValueChange={setInput}
              loading={busy}
              onStop={stop}
              onSubmit={submit}
              minRows={1}
              maxRows={4}
              placeholder="Ask the agent to continue…"
              models={models?.map(
                (model) =>
                  ({
                    value: model.name,
                    label: model.name,
                  }) as PromptModel
              )}
              onModelChange={(model) => setModel(model)}
              defaultModel={models?.[0]?.name}
              actions={[
                { value: "attach", label: "Attach file", icon: <Paperclip /> },
                {
                  value: "project",
                  label: "Add project context",
                  icon: <FolderKanban />,
                },
                {
                  value: "skill",
                  label: "Use a skill",
                  icon: <WandSparkles />,
                },
              ]}
            />
          </div>
        </div>
        {showNewConversationModal && (
          <CenterMorphModal
            open={showNewConversationModal}
            onOpenChange={setShowNewConversationModal}
          >
            <CenterMorphModalContent
              ariaLabel="New Conversation"
              className="max-w-md"
            >
              <div className="p-6">
                <h2 className="mb-6 text-lg font-semibold">
                  Create New Conversation
                </h2>
                <Input
                  value={conversationName}
                  type="text"
                  onChange={(e) => setConversationName(e)}
                  placeholder="Conversation title..."
                  className="mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowNewConversationModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      handleCreateConversation(conversationName)
                      // TODO: create conversation
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </CenterMorphModalContent>
          </CenterMorphModal>
        )}
        {showNewProjectModal && (
          <CenterMorphModal
            open={showNewProjectModal}
            onOpenChange={setShowNewProjectModal}
          >
            <CenterMorphModalContent
              ariaLabel="New Project"
              className="max-w-md"
            >
              <div className="p-6">
                <h2 className="mb-6 text-lg font-semibold">
                  Create New Project
                </h2>
                <Input
                  value={projectName}
                  type="text"
                  onChange={(e) => setProjectName(e)}
                  placeholder="Project title..."
                  className="mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowNewProjectModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleCreateProject(projectName)}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </CenterMorphModalContent>
          </CenterMorphModal>
        )}
      </AnimatedSidebarInset>
    </ChatApp>
  )
}
