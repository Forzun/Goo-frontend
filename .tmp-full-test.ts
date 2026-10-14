import initSqlJs from "sql.js"
import { processConversationMemory } from "@/lib/memory/process-conversation-memory"
import { EmbeddingRepository } from "@/lib/embedding/embedding-repository"
import { indexMarkdownMemory } from "@/lib/embedding/memory-embedding"
import { MEMORY_EXTRATION } from "@/lib/prompt/memory-extraction"
import { MEMORY_UPDATE } from "@/lib/prompt/memory-update"

const MEM = `# Conversation Memory

## Current goal
- Test goal
`

const messages = [
  { id: "1", role: "user", content: "Hi, I'm a frontend developer at an e-commerce startup called Shoply. I'm building our dashboard in Next.js 15 with TypeScript and Tailwind, deployed on Vercel. I prefer strict mode in tsconfig and I hate var. Also, write me a debounce hook in TypeScript for the search bar.", createdAt: new Date().toISOString() },
  { id: "2", role: "assistant", content: "Here is a debounce hook...", createdAt: new Date().toISOString() },
] as any

const files: Record<string, string> = { "conv/memory.md": MEM }

async function main() {
  const SQL = await initSqlJs({ locateFile: (f: string) => `node_modules/sql.js/dist/${f}` })
  const db = new SQL.Database()
  db.exec(`CREATE TABLE embeddings (id TEXT PRIMARY KEY, source_type TEXT NOT NULL, source_id TEXT NOT NULL, source_path TEXT NOT NULL, model TEXT NOT NULL, dimension INTEGER NOT NULL, embedding BLOB NOT NULL, content_hash TEXT NOT NULL, created_at TEXT NOT NULL)`)

  const fs = {
    readFile: async (p: string) => { if (!(p in files)) throw new Error("ENOENT: " + p); return files[p] },
    writeFile: async (p: string, c: string) => { files[p] = c },
  }

  console.log("== running processConversationMemory with real Ollama (qwen3:8b) ==")
  const processed = await processConversationMemory({
    db, fs,
    conversationId: "conv-1",
    memoryPath: "conv/memory.md",
    messages,
    model: "qwen3:8b",
    prompts: { extraction: MEMORY_EXTRATION, update: MEMORY_UPDATE },
  })
  console.log("processed:", processed)
  console.log("=== memory.md after ===")
  console.log(files["conv/memory.md"])
  console.log("=== end memory.md ===")

  console.log("== indexing ==")
  const repo = new EmbeddingRepository(db)
  const result = await indexMarkdownMemory(fs, "conv/memory.md", repo, "nomic-embed-text")
  console.log("index result:", result)
  console.log("rows:", JSON.stringify(db.exec("SELECT COUNT(*) FROM embeddings")))
}
main().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e); process.exit(1) })
