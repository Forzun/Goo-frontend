import { Switch } from "../components/ui/switch"
import bg from "@/assets/bg-mountain.jpg"

const pixel = { fontFamily: "VT323, monospace" } as const
const serif = { fontFamily: "Cormorant, serif" } as const

export default function Page() {
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${bg.src})`, ...pixel, fontSize: "13px" }}
    >
      <nav
        className="flex items-center justify-between px-8 py-5"
        style={{ ...pixel, fontSize: "13px" }}
      >
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <span style={{ color: "#FF8D52" }}>✳</span>
            <span>Own It</span>
          </a>
          <a href="#" className="opacity-90 hover:opacity-100">
            Pricing
          </a>
          <a href="#" className="opacity-90 hover:opacity-100">
            Affiliate Program
          </a>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="opacity-90 hover:opacity-100">
            Try the demo
          </a>
          <a
            href="#"
            className="rounded-full bg-black/70 px-4 py-2 text-white hover:bg-black"
            style={{ ...pixel, fontSize: "13px" }}
          >
            Sign in
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-col items-center px-4 pt-16 pb-24">
        <h1
          className="text-center leading-[1.05]"
          style={{
            ...serif,
            fontSize: "42px",
            fontWeight: 700,
            color: "#FFF7E8",
            letterSpacing: "0.02em",
          }}
        >
          Stop Renting AI.
          <br />
          <em className="italic">Own It.</em>
        </h1>
        <p
          className="mt-5 text-center text-white/90"
          style={{ ...pixel, fontSize: "13px" }}
        >
          Think, plan and build with models that live on your machine.
        </p>

        {/* Mac terminal window */}
        <div className="mt-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f10] shadow-2xl">
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
              <pre
                className="leading-[0.9]"
                style={{ ...pixel, fontSize: "42px", color: "#FF8D52" }}
              >
                {` __  
/ _\\ 
\\__ \\
|___/`}
              </pre>
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
                  Model: llama3.2{" "}
                  <span className="text-white/50">/upgrade</span>
                </div>
              </div>
            </div>
            <div
              className="mt-6 flex items-center gap-4"
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
          {/* Footer bar */}
          <div className="flex items-center justify-between border-t border-white/5 bg-[#141416] px-4 py-2.5">
            <div className="flex items-center gap-2 text-white/80">
              <span
                className="rounded-md bg-[#FF8D52] px-2 py-1 text-black"
                style={{ ...pixel, fontSize: "13px" }}
              >
                Vibe
              </span>
              <span
                className="rounded-md bg-white/10 px-2 py-1"
                style={{ ...pixel, fontSize: "13px" }}
              >
                Spec
              </span>
              <span
                className="pl-1 opacity-80"
                style={{ ...pixel, fontSize: "13px" }}
              >
                AA Opus 4.6
              </span>
            </div>
            <div className="flex items-center gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <Switch
                  defaultChecked
                  className="h-4 w-7 data-[state=checked]:bg-[#FF8D52] data-[state=unchecked]:bg-white/20 [&>span]:h-3 [&>span]:w-3 [&>span]:bg-white [&>span[data-state=checked]]:translate-x-3"
                />
                <span style={{ ...pixel, fontSize: "13px" }}>Clone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  aria-label="Public"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                <span style={{ ...pixel, fontSize: "13px" }}>Public</span>
              </div>
              <button className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF8D52] text-black">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                  aria-label="Upload"
                >
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="mt-8 flex items-center gap-3 rounded-full bg-black/70 px-4 py-2">
          <span className="h-5 w-5 rounded-full bg-[#FF8D52]" />
          <div className="leading-tight">
            <div
              className="text-white/60"
              style={{ ...pixel, fontSize: "10px", letterSpacing: "0.1em" }}
            >
              PRODUCT HUNT
            </div>
            <div className="text-white" style={{ ...pixel, fontSize: "13px" }}>
              #3 Product of the Day
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
    </div>
  )
}
