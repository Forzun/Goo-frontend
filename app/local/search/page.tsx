import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

import { GooFaceIcon } from "@/components/local/agents/goo-face-icon"
import { pixel } from "@/app/page"

export default function SearchPage() {
  return (
    <main className="flex h-full min-h-[32rem] flex-col items-center justify-center bg-main-bg px-6 py-16 text-text-primary">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-edge bg-[#181819]">
          <Construction className="size-7 text-[#FF6D00]" />
        </div>

        <h1
          style={pixel}
          className="mt-5 text-4xl font-normal tracking-tight sm:text-5xl"
        >
          Under Construction
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Search is being wired into your local workspace. Soon you&apos;ll be
          able to find conversations, memories, and files from one place.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-edge bg-[#181819]/80 px-3 py-1 text-[11px] text-text-dim">
          <GooFaceIcon className="size-4 text-text-primary" />
          Goo is still building this
        </div>

        <Link
          href="/local"
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-edge bg-[#181819] px-4 py-2 text-xs text-text-secondary transition-colors hover:border-[#FF6D00]/50 hover:text-text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to chat
        </Link>
      </div>
    </main>
  )
}
