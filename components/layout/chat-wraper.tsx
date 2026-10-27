"use client"

import dynamic from "next/dynamic"

const WorkspaceChatLayout = dynamic(() => import("./workspace-chat-layout"), {
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      Loading workspace…
    </div>
  ),
})

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WorkspaceChatLayout>{children}</WorkspaceChatLayout>
}
