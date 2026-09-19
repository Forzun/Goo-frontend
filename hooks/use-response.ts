"use client"

import {
  OllamaConnectionError,
  OllamaResponseError,
  ollamaResponse,
} from "@/lib/ollama"
import { useCallback, useEffect, useRef, useState } from "react"

interface UseResponseResult {
  data: string | undefined
  loading: boolean
  error: Error | null
  send: (prompt: string) => Promise<void>
  stop: () => void
}

export function useResponse(model: string): UseResponseResult {
  const [data, setData] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
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
      let gotFirstToken = false

      setLoading(true)
      setError(null)
      setData("")

      try {
        for await (const token of ollamaResponse(prompt, model, {
          signal: ac.signal,
        })) {
          if (ac.signal.aborted) return
          if (!gotFirstToken) {
            gotFirstToken = true
            setLoading(false)
          }
          output += token
          setData(output)
        }
      } catch (err) {
        if (ac.signal.aborted) return // cleanup abort — not a real error
        if (
          err instanceof OllamaConnectionError ||
          err instanceof OllamaResponseError
        ) {
          setError(err)
        } else {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    },
    [model]
  )

  const stop = useCallback(() => acRef.current?.abort(), [])

  useEffect(() => () => acRef.current?.abort(), [])  

  return { data, loading, error, send , stop}
}
