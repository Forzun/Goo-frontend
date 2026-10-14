import { ConversationMessage } from "@/types/workspace"
import type { Database } from "sql.js"

const OLLAMA_URL = "http://localhost:11434"

// Cold model loads can take ~50s, but format:"json" + thinking models (qwen3)
// can hang forever — without a cap the memory pipeline never resolves and
// embeddings are never indexed.
const OLLAMA_TIMEOUT_MS = 120_000
const MAX_ATTEMPTS = 2

interface MemoryPrompts {
  extraction: string
  update: string
}

interface ProcessMemoryOptions {
  db: Database
  fs: {
    readFile(path: string): Promise<string>
    writeFile(path: string, content: string): Promise<void>
  }
  conversationId: string
  memoryPath: string
  messages: ConversationMessage[]
  model: string
  prompts: MemoryPrompts
}

interface ExtractionResult {
  items: Array<{
    type: string
    text: string
  }>
}

interface UpdateResult {
  operations: Array<{
    action: "add" | "replace" | "remove" | "ignore"
    section: string
    old_text: string | null
    new_text: string
    reason: string
  }>
}

const MIN_NEW_USER_MESSAGES = 1

function countUserMessages(messages: ConversationMessage[]): number {
  return messages.filter((message) => message.role === "user").length
}

function parseJson<T>(content: string): T {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")

  return JSON.parse(cleaned) as T
}

function fillPrompt(
  template: string,
  placeholders: Record<string, string>
): string {
  return Object.entries(placeholders).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    template
  )
}

async function askOllamaJson(model: string, prompt: string): Promise<string> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          // Thinking models loop indefinitely on format:"json" — disable it.
          think: false,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? "Ollama memory request failed")
      }

      const content = result.message?.content

      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Ollama returned an empty memory response")
      }

      return content
    } catch (error) {
      lastError = error
      console.warn(
        `Memory LLM call failed (attempt ${attempt}/${MAX_ATTEMPTS}, model: ${model}):`,
        error
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Ollama memory request failed")
}

const VALID_SECTIONS = new Set([
  "Current goal",
  "Important context",
  "User preferences",
  "Decisions",
  "Open questions",
  "Next steps",
])

// Matches candidate facts that merely restate a one-off coding request
// ("User requested a debounce hook", "User needs a React component") instead
// of a durable fact about the user or their project.
const TRANSIENT_TASK_ITEM =
  /\b(request(?:ed|s|ing)|needs?|wants?|asked for|asking for)\b[^.]*\b(hook|component|function|snippet|script|boilerplate|helper|debounce|throttle|code block|piece of code|sample code|example code)\b/i

function isTransientTaskItem(text: string): boolean {
  return TRANSIENT_TASK_ITEM.test(text)
}

function applyMemoryOperations(
  memory: string,
  operations: UpdateResult["operations"]
): string {
  let result = memory

  for (const operation of operations) {
    if (operation.action === "ignore") continue
    if (!operation.new_text?.trim()) {
      const text = operation.new_text?.trim()

      if (!text || text.split(/\s+/).length < 3) {
        console.warn("Skipping incomplete memory fact:", text)
        continue
      }
    }

    // The model sometimes omits or invents a section — writing
    // "## undefined" corrupts the file, so fall back for adds and
    // skip replace/remove (they cannot locate a bullet without a section).
    let section = operation.section
    if (!VALID_SECTIONS.has(section)) {
      if (operation.action !== "add") {
        console.warn("Skipping memory operation with unknown section:", section)
        continue
      }
      console.warn(
        `Unknown memory section "${section}" — using "Important context"`
      )
      section = "Important context"
    }

    const heading = `## ${section}`
    const headingIndex = result.indexOf(heading)

    if (headingIndex === -1) {
      if (operation.action === "add" && operation.new_text.trim()) {
        result = `${result.trimEnd()}\n\n${heading}\n- ${operation.new_text.trim()}\n`
      }
      continue
    }

    const sectionStart = headingIndex + heading.length
    const nextHeading = result.indexOf("\n## ", sectionStart)
    const sectionEnd = nextHeading === -1 ? result.length : nextHeading

    let sectionContent = result.slice(sectionStart, sectionEnd)

    if (operation.action === "add") {
      sectionContent = `${sectionContent.trimEnd()}\n- ${operation.new_text.trim()}\n`
    } else if (operation.action === "replace" && operation.old_text) {
      if (!sectionContent.includes(operation.old_text)) continue

      sectionContent = sectionContent.replace(
        operation.old_text,
        operation.new_text
      )
    } else if (operation.action === "remove" && operation.old_text) {
      sectionContent = sectionContent.replace(operation.old_text, "")
    }

    result =
      result.slice(0, sectionStart) + sectionContent + result.slice(sectionEnd)
  }

  return result.trimEnd() + "\n"
}

export async function processConversationMemory(
  options: ProcessMemoryOptions
): Promise<{
  processed: boolean
  processedUserMessages: number
}> {
  const { db, fs, conversationId, memoryPath, messages, model, prompts } =
    options

  // Create the checkpoint table if it doesn't exist.
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_processing_state (
      conversation_id TEXT PRIMARY KEY,
      processed_user_message_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `)

  // Get the last successfully processed user-message count.
  const checkpointResult = db.exec(
    `SELECT processed_user_message_count
     FROM memory_processing_state
     WHERE conversation_id = ?`,
    [conversationId]
  )

  const processedCount = checkpointResult.length
    ? Number(checkpointResult[0].values[0][0])
    : 0

  const currentUserCount = countUserMessages(messages)
  const newUserCount = currentUserCount - processedCount

  if (newUserCount < MIN_NEW_USER_MESSAGES) {
    return {
      processed: false,
      processedUserMessages: processedCount,
    }
  }

  // Start at the first message after the last processed user message.
  let startIndex = 0
  let seenUsers = 0

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      seenUsers++

      if (seenUsers === processedCount) {
        startIndex = i + 1
        break
      }
    }
  }

  const newMessages = messages.slice(startIndex)

  if (!newMessages.some((message) => message.role === "user")) {
    return {
      processed: false,
      processedUserMessages: processedCount,
    }
  }

  const currentMemory = await fs.readFile(memoryPath)

  console.log("current memory: " + currentMemory)
  // Stage 1: extract candidate facts from the latest user message only.
  const newUserMessages = newMessages.filter(
    (message) => message.role === "user"
  )
  const latestUserMessage = newUserMessages[newUserMessages.length - 1]

  const extractionPrompt = fillPrompt(prompts.extraction, {
    "memory.md": currentMemory,
    "recent messages": latestUserMessage.content,
  })

  const extractionContent = await askOllamaJson(model, extractionPrompt)

  console.log("extractionContent",extractionContent)
  const extraction = parseJson<ExtractionResult>(extractionContent)

  if (!Array.isArray(extraction.items)) {
    throw new Error("Invalid memory extraction response")
  }

  // Defense-in-depth: drop transient coding-task items even if the model
  // failed to follow the prompt (e.g. "User requested a debounce hook").
  const candidateItems = extraction.items.filter((item) => {
    if (isTransientTaskItem(item?.text ?? "")) {
      console.log("Filtered transient coding-task item:", item.text)
      return false
    }
    return true
  })

  console.log("candidateItems",candidateItems)
  // Nothing useful to remember: advance the checkpoint safely.
  if (candidateItems.length === 0) {
    saveCheckpoint(db, conversationId, currentUserCount)

    return {
      processed: true,
      processedUserMessages: currentUserCount,
    }
  }

  // Stage 2: ask the model how to update the memory.
  const updatePrompt = fillPrompt(prompts.update, {
    "memory.md": currentMemory,
    "items from extraction": JSON.stringify(candidateItems),
  })

  const updateContent = await askOllamaJson(model, updatePrompt)
  const update = parseJson<UpdateResult>(updateContent)

  if (!Array.isArray(update.operations)) {
    throw new Error("Invalid memory update response")
  }

  console.log('updated memory:', updateContent , updatePrompt  )
  const updatedMemory = applyMemoryOperations(currentMemory, update.operations)

  // Save and verify memory BEFORE advancing the checkpoint.
  console.log("message saving here:", updatedMemory)
  await fs.writeFile(memoryPath, updatedMemory)

  const savedMemory = await fs.readFile(memoryPath)

  if (savedMemory !== updatedMemory) {
    throw new Error("Memory verification failed; checkpoint not advanced")
  }

  saveCheckpoint(db, conversationId, currentUserCount)

  return {
    processed: true,
    processedUserMessages: currentUserCount,
  }
}

function saveCheckpoint(
  db: Database,
  conversationId: string,
  processedCount: number
): void {
  db.run(
    `INSERT OR REPLACE INTO memory_processing_state
     (conversation_id, processed_user_message_count, updated_at)
     VALUES (?, ?, ?)`,
    [conversationId, processedCount, new Date().toISOString()]
  )
}
