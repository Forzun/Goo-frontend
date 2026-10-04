"use client"

import GetLocalLocation from "@/components/get-local";
import { ChatAppExample } from "@/components/local/agents/chat-app-usage";
import { useWorkspace } from "@/hooks/use-workspace";

export default function Page() {
  const {status} = useWorkspace()

  return (
    <div className="h-full w-full">
      {status == "no-workspace" ? < GetLocalLocation /> : status === "loading" ? "": <ChatAppExample />
      }
    </div>
  )
}
