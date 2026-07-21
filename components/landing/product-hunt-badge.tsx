"use client"

import { pixel } from "@/app/page"

export default function ProductHuntBadge() {
  return (
    <a
      href="https://www.producthunt.com"
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#1a1a1a]/90 px-5 py-2.5 backdrop-blur-sm transition-all duration-300 hover:bg-[#252525]/95 hover:shadow-[0_0_20px_rgba(255,141,82,0.15)]"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Product Hunt Cat Logo */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6154]">
        <svg
          viewBox="0 0 40 40"
          className="h-5 w-5"
          fill="white"
        >
          <path d="M22.667 20H17.333v-6.667h5.334a3.333 3.333 0 0 1 0 6.667zM20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm2.667 23.333H17.333V30h-3.334V10h8.668a6.667 6.667 0 0 1 0 13.333z" />
        </svg>
      </div>

      {/* Text Content */}
      <div className="flex flex-col leading-tight">
        <span
          className="text-white/50 uppercase tracking-[0.15em]"
          style={{ ...pixel, fontSize: "10px" }}
        >
          Product Hunt
        </span>
        <span
          className="text-white font-medium"
          style={{ ...pixel, fontSize: "15px" }}
        >
          <span className="text-[#FF6154]">#3</span>{" "}
          Product of the Day
        </span>
      </div>

      {/* Upvote arrow indicator */}
      <div className="ml-2 flex flex-col items-center rounded-md border border-white/10 px-2 py-1 transition-colors duration-300 group-hover:border-[#FF6154]/30 group-hover:bg-[#FF6154]/10">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-[#FF6154]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span
          className="text-white/70"
          style={{ ...pixel, fontSize: "11px" }}
        >
          412
        </span>
      </div>
    </a>
  )
}
