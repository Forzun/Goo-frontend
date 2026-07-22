import { pixel, serif } from "@/app/page"

import { ZodiacAquarius } from "lucide-react"

export default function HeroSection() {
  return (
    <main className="flex flex-col items-center px-4 pt-16 pb-24">
      <h1
        className="text-center leading-[0.8] tracking-tighter"
        style={{
          ...serif,
          fontSize: "48px",
          fontWeight: 700,
          color: "#FFF7E8",
        }}
      >
        Stop Renting AI.
        <br />
        <em className="italic">Own It.</em>
      </h1>
      <p
        className="mt-5 text-center text-white/90"
        style={{ ...pixel, fontSize: "18px" }}
      >
        Run local models with Ollama and code without burning API credits.
      </p>

      {/* Mac terminal window */}
      <div className="mt-8 w-full max-w-xl overflow-hidden rounded border border-white/10 bg-[#0f0f10] shadow-2xl">
        {/* Title bar with tab + traffic lights */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
          <span
            className="text-white/80"
            style={{ ...pixel, fontSize: "13px" }}
          >
            src git:(main) X bun run index.ts
          </span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
        </div>
        {/* Body */}
        <div className="px-6 pt-6 pb-8">
          <div className="flex items-start gap-5">
            <span
              style={{
                ...pixel,
                fontSize: "90px",
                color: "#FF8D52",
                lineHeight: 1,
              }}
            >
              G
            </span>
            <div className="pt-1">
              <div style={{ ...pixel, fontSize: "18px" }}>
                <span style={{ color: "#FF8D52" }}>Goo CLI</span>
                <span className="ml-6 text-white/90">v0.1.0</span>
              </div>
              <div
                className="mt-2 text-white/90"
                style={{ ...pixel, fontSize: "15px" }}
              >
                Signed in with Ollama{" "}
                <span className="text-white/50">/auth</span>
              </div>
              <div
                className="text-white/90"
                style={{ ...pixel, fontSize: "15px" }}
              >
                Model: llama3.2 <span className="text-white/50">/upgrade</span>
              </div>
            </div>
          </div>
          <div
            className="mt-2 flex items-center gap-4"
            style={{ ...pixel, fontSize: "15px", color: "#FF8D52" }}
          >
            <span>? Select a model</span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FF8D52]" />
              llama3.1:8b
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FF8D52]" />
              kimi-k2.5:cloud
            </span>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="mt-8 flex items-center gap-3 rounded-sm bg-zinc-900/90 px-4 py-2">
        <ZodiacAquarius className="h-5 w-5 text-[#FF8D52]" />
        <div className="leading-tight">
          <div
            className="text-white/60"
            style={{ ...pixel, fontSize: "10px", letterSpacing: "0.1em" }}
          >
            Open Source.
          </div>
          <div className="text-white" style={{ ...pixel, fontSize: "13px" }}>
            Self-Hosted. Yours Forever.
          </div>
        </div>
      </div>

      {/* Logos row */}
      <div className="mt-20 flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-6 text-white/80">
        {/* Bun */}
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 80 70"
            className="h-6 w-6"
            fill="currentColor"
            aria-label="Bun"
          >
            <ellipse cx="40" cy="38" rx="38" ry="30" />
          </svg>
        </div>
        {/* Ollama */}
        <span style={{ ...serif, fontSize: "20px" }}>Ollama</span>
        {/* Stack Overflow */}
        <svg
          viewBox="0 0 32 37"
          className="h-6 w-6"
          fill="currentColor"
          aria-label="Stack Overflow"
        >
          <path d="M26 33v-9h3v12H0V24h3v9z" />
          <path d="M7 22l16 3 .5-3-16-3zm2-7l15 7 1.5-2.5-15-7zm4-7l13 11 2-2.5-13-11zm7-8l-2.5 2 10 13 2.5-2zM7 30h16v-3H7z" />
        </svg>
        {/* GitHub */}
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="currentColor"
          aria-label="GitHub"
        >
          <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.3-.2-.3-.6-1.6.1-3.3 0 0 1-.3 3.3 1.3a11 11 0 0 1 6 0c2.3-1.6 3.3-1.3 3.3-1.3.7 1.7.2 3 .1 3.3.8.9 1.3 2 1.3 3.3 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
        </svg>
        {/* Obsidian */}
        <span style={{ ...pixel, fontSize: "22px" }}>obsidian</span>
        {/* Ghostty */}
        <span style={{ ...serif, fontSize: "22px" }}>Ghostty Terminal</span>
        {/* Embedding models */}
        <span style={{ ...pixel, fontSize: "18px" }}>embedding models</span>
      </div>
    </main>
  )
}
