import {
  OllamaConnectionError,
  OllamaResponseError,
  fetchOllamaModels,
} from "@/lib/ollama"
import { LocalModel } from "@/types/ollama"
import { useEffect, useState } from "react"

export function useFetchModels() {
  const [models, setModels] = useState<LocalModel[]>()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadModels() {
      try {
        setLoading(true)
        const res = await fetchOllamaModels()
        if (isMounted) {
          setModels(res)
        }
      } catch (err) {
        console.log(err)
        if (isMounted) {
          if (err instanceof OllamaConnectionError) {
            console.error("Ollama not running")
          } else if (err instanceof OllamaResponseError) {
            console.error("Ollama response error")
          } else {
            console.error("Error fetching models:", err)
          }
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadModels()

    return () => {
      isMounted = false
    }
  }, [])

  return { models, loading, error }
}

