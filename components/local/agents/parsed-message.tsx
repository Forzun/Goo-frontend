import { parseSegmentsStreaming } from "@/lib/parseCodeBlock"
import { StreamingResponse } from "./streaming-response"
import { CodeBlock } from "./code-block"
import { Loader } from "../motion/loader"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ParsedMessageProps {
  content: string
  streaming: boolean
  showActions: boolean
}

function isInsideCodeFence(text: string): boolean {
  const fences = text.match(/```/g)
  return fences !== null && fences.length % 2 === 1
}

export default function ParsedMessage({
  content,
  streaming,
  showActions,
}: ParsedMessageProps) {
  const segments = parseSegmentsStreaming(content)
  const waitingForCode = streaming && isInsideCodeFence(content)

  function CodeBlockLoading() {
    return <Loader variant="morph" size={20} />
  }

  return (
    <StreamingResponse
      status={streaming ? "streaming" : "complete"}
      showActions={showActions}
      copyText={content}
    >
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span
            key={i}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{seg.content}</Markdown>
          </span>
        ) : (
          <CodeBlock
            key={i}
            language={"typescript"}
            code={seg.content}
            status={streaming ? "streaming" : "complete"}
            showLineNumbers
            filename={seg.language ? `code.${seg.language}` : "code"}
          />
        )
      )}
      {waitingForCode && <Loader variant="dither" size={20} />}
    </StreamingResponse>
  )
}
