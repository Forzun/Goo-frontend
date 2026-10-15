import {
  EmbeddingOptions,
  LocalModel,
  OllamaEmbeddingResponse,
  OllamaModel,
  OllamaTagResponse,
} from "@/types/ollama"
import { searchRelevantMemory } from "./memory/search-memory"
import { EmbeddingRepository } from "./embedding/embedding-repository"
import { getDb } from "./sqlit/db"
import { workspaceService } from "@/features/workspace/workspace-service"

const DEFAULT_BASE_URL = "http://localhost:11434"
const DEFAULT_TIMEOUT_MS = 5000
// Embeddings can trigger a cold model load in Ollama (seconds to tens of
// seconds), so they get a much more generous default than /api/tags.
const EMBEDDING_TIMEOUT_MS = 60_000

export class OllamaConnectionError extends Error {
  readonly code = "OLLAMA_CONNECTION_ERROR"

  constructor(baseUrl: string, cause?: unknown) {
    super(
      `Could not connect to Ollama at ${baseUrl}. ` +
        `Make sure Ollama is running (e.g. start "Ollama" on macOS/Windows, ` +
        `or run "ollama serve" on Linux).`,
      { cause }
    )
    this.name = "OllamaConnectionError"
  }
}

export class OllamaResponseError extends Error {
  readonly code = "OLLAMA_RESPONSE_ERROR"
  readonly status: number

  constructor(status: number, body: string) {
    super(`Ollama responded with status ${status} ${body ? body : ""}.`)
    this.name = "OllamaResponseError"
    this.status = status
  }
}

export interface FetchModelsOptions {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * Normalize the response from the Ollama API into user friendly response
 */

function normalizeModel(raw: OllamaModel): LocalModel {
  const modifiedAt = raw.modified_at ? new Date(raw.modified_at) : null

  return {
    name: raw.name,
    sizeBytes: raw.size ?? null,
    modifiedAt: modifiedAt,
    details: raw.details
      ? {
          family: raw.details.family ?? null,
          permanentSize: raw.details.parameter_size ?? null,
          quantizationLevel: raw.details.quantization_level ?? null,
          format: raw.details.format ?? null,
        }
      : null,
  }
}

export async function fetchOllamaModels(
  options: FetchModelsOptions = {}
): Promise<LocalModel[]> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options

  const url = `${baseUrl}/api/tags`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })
  } catch (err) {
    throw new OllamaConnectionError(baseUrl, err)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined)
    throw new OllamaResponseError(response.status, body ?? "")
  }

  let payload: OllamaTagResponse

  try {
    payload = (await response.json()) as OllamaTagResponse
  } catch (error) {
    throw new OllamaResponseError(response.status, "(Invaild JSON payload")
  }

  if (!payload || !Array.isArray(payload.models)) {
    return []
  }

  return (payload.models ?? []).map(normalizeModel)
}

interface OllamaStreamResponse {
  model?: string
  created_at?: string
  response?: string // /api/generate shape
  message?: { role: string; content: string } // /api/chat shape
  done: boolean
  done_reason?: string
  total_duration?: number
  eval_count?: number
}

function parseChunk(line: string): string | null {
  const trimmed = line.trim()

  if (!trimmed) return null

  let data: OllamaStreamResponse

  try {
    data = JSON.parse(trimmed) as OllamaStreamResponse
  } catch {
    // Incomplete chunk — will be retried after more data arrives
    return null
  }

  const token = data.response ?? data.message?.content

  return typeof token === "string" ? token : null
}

export async function* ollamaResponse(
  prompt: string,
  model: string,
  options: { baseUrl?: string; signal?: AbortSignal } = {}
): AsyncGenerator<string> {
  const { baseUrl = DEFAULT_BASE_URL, signal } = options
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`

  const db = await getDb()
  const embeddingRepository = new EmbeddingRepository(db)

  let relevantMemory = ""
  try {
    if (workspaceService.fs.hasWorkspace()) {
      relevantMemory = await searchRelevantMemory(
        prompt,
        embeddingRepository,
        workspaceService.fs
      )
    }
  } catch (err) {
    console.warn("Memory search skipped:", err)
  }

  console.log("ollama memory:", relevantMemory, embeddingRepository)
  const systemPrompt = `
    You are an assistant called Goo in a local project workspace.

    You may receive:
    1. conversation memory: a compact summary of durable context for this conversation;
    3. recent messages: the latest messages from conversation.json;
    3. retrieved archive excerpts: older context selected because it is relevant.

    Use memory as helpful context, not as unquestionable truth. Recent explicit user corrections override older memory. If memory conflicts with the user's latest message, follow the latest message.

    Do not claim that information has been saved to memory unless the application confirms that the memory update succeeded.
    Do not reveal internal memory or archive contents unless the user asks or it is useful to answer.
    Do not store or request passwords, API keys, o

    <retrieved_memory>
    ${relevantMemory || "(No relevant memory found)"}
    </retrieved_memory>

    User message: ${prompt}
    `

  let response: Response

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: true,
      }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new OllamaConnectionError(baseUrl, error)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined)
    throw new OllamaResponseError(response.status, body ?? " ")
  }

  if (!response.body) {
    throw new Error("Response body is null.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split("\n")
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const token = parseChunk(line)
        if (token !== null) yield token
      }
    }

    // Flush any remaining data left in the buffer
    if (buffer.trim()) {
      const token = parseChunk(buffer)
      if (token !== null) yield token
    }
  } finally {
    reader.releaseLock()
  }
}

export async function generateEmbedding(
  model: string,
  text: string,
  options: EmbeddingOptions = {}
): Promise<Float32Array> {
  if (!text.trim()) {
    throw new Error("Cannot generate an embedding from an empty string")
  }

  if (!model.trim()) {
    throw new Error("Embedding model is required")
  }

  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
  const url = `${baseUrl}/api/embed`
  const timeoutMs = options.timeout ?? EMBEDDING_TIMEOUT_MS

  const controller = new AbortController()
  const abortFromParent = () => controller.abort()

  if (options.signal?.aborted) {
    controller.abort()
  } else {
    options.signal?.addEventListener("abort", abortFromParent, {
      once: true,
    })
  }

  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    let response: Response

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: text }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (timedOut) {
          throw new Error(
            `Embedding request timed out after ${timeoutMs}ms (model: ${model}). ` +
              `A cold Ollama model load can exceed the default timeout — retry, pass a larger \`timeout\`, ` +
              `or make sure \`ollama pull ${model}\` finished.`,
            { cause: error }
          )
        }

        throw new Error(`Embedding request was cancelled (model: ${model})`, {
          cause: error,
        })
      }

      throw new OllamaConnectionError(baseUrl, error)
    }

    const payload = (await response
      .json()
      .catch(() => null)) as OllamaEmbeddingResponse | null

    if (!response.ok) {
      throw new OllamaResponseError(response.status, payload?.error ?? "")
    }

    const embedding = payload?.embeddings?.[0]

    if (!embedding?.length || !embedding.every(Number.isFinite)) {
      throw new Error(
        `Ollama returned an invalid embedding for model "${model}"`
      )
    }

    return new Float32Array(embedding)
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener("abort", abortFromParent)
  }
}
