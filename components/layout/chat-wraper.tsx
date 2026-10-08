"use client"
import { useWorkspace } from "../../hooks/use-workspace"
import GetLocalLocation from "../get-local"
import { ChatAppExample } from "../local/agents/chat-app-usage"

export default function ChatLayout({children}: {children:React.ReactNode}) {
  const {status} = useWorkspace()

  if (status === "loading") {
     return <div className="h-screen flex items-center justify-center">Loading workspace…</div>
  }

  if (status === "no-workspace") {
    return <GetLocalLocation />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <ChatAppExample className="h-full" />
      </div>
      {children}
    </div>
  )
}
