import { parseSegmentsStreaming } from "@/lib/parseCodeBlock";
import { StreamingResponse } from "./streaming-response";
import { CodeBlock } from "./code-block";
import { Lancelot } from "next/font/google";

interface ParsedMessageProps { 
    content: string; 
    streaming: boolean; 
    showActions: boolean 
}

export default function ParsedMessage({content , streaming , showActions}: ParsedMessageProps){ 
    
    const segments = parseSegmentsStreaming(content) 

    return <StreamingResponse 
        status={streaming ? "streaming" : "complete"}
        showActions={showActions}
        copyText={content}
   >
    {segments.map((seg , i) => (
       seg.type === "text" ? <p key={i} className="whitespace-pre-wrap">{seg.content}</p>: 
       <CodeBlock 
        key={i}
        language={"typescript"}
        code={seg.content}
        status={streaming ? "streaming" : "complete"}
        showLineNumbers
        filename={seg.language ? `code.${seg.language}` : "code"}
       />
    ))}
    </StreamingResponse> 

}

