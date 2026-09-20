"use client"

import {
  OllamaConnectionError,
  OllamaResponseError,
  ollamaResponse,
} from "@/lib/ollama"
import { useCallback, useEffect, useRef, useState } from "react"

interface UseResponseResult {
  data: string | undefined
  /** True from the moment send() is called until the entire stream completes. */
  loading: boolean
  /** True once the first token has arrived and the stream is actively producing text. */
  streaming: boolean
  error: Error | null
  send: (prompt: string) => Promise<void>
  stop: () => void
}

export function useResponse(model: string): UseResponseResult {
  const [data, setData] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [streaming, setStreaming] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const acRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (prompt: string) => {
      if (!prompt || !model) return

      if (acRef.current) {
        acRef.current.abort()
      }

      const ac = new AbortController()
      acRef.current = ac
      let output = ""
      let started = false

      setLoading(true)
      setStreaming(false)
      setError(null)
      setData("")

      try {
        for await (const token of ollamaResponse(prompt, model, {
          signal: ac.signal,
        })) {
          if (ac.signal.aborted) return
          if (!started) {
            started = true
            setStreaming(true)
          }
          output += token
          setData(output)
        }
      } catch (err) {
        if (ac.signal.aborted) return
        if (
          err instanceof OllamaConnectionError ||
          err instanceof OllamaResponseError
        ) {
          setError(err)
        } else {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
          setStreaming(false)
        }
      }
    },
    [model]
  )

  const stop = useCallback(() => acRef.current?.abort(), [])

  useEffect(() => () => acRef.current?.abort(), [])

  return { data, loading, streaming, error, send, stop }
}
