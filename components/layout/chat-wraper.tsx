"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const WorkspaceChatLayout = dynamic(
  () => import("./workspace-chat-layout"),
  {
    loading: () => (
      <div className="h-screen flex items-center justify-center">
        Loading workspace…
      </div>
    ),
  }
)

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname?.startsWith("/local/myGoo")) {
    return <>{children}</>
  }

  return <WorkspaceChatLayout>{children}</WorkspaceChatLayout>
}
