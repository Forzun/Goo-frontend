"use client"

import { ChatAppExample } from "@/components/local/agents/chat-app-usage";
import { useResponse } from "@/hooks/use-response";

export default function Page() {

  return (
    <div className="h-full w-full">
      <ChatAppExample />
    </div>
  )
}
