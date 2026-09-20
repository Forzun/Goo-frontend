export type Segment = { type: "text"; content: string } | { type: "code"; language: string | null; content: string }

const FENCE_RE = /```(\w*)\n?([\s\S]*?)(?:```|$)/g

export function parseSegments(reply: string): Segment[] { 

    let segment: Segment[] = []
    let lastIndex = 0;
    FENCE_RE.lastIndex = 0 

    let match: RegExpExecArray | null;
    
    while((match = FENCE_RE.exec(reply)) !== null){
  
        if(match.index > lastIndex){
            const text = reply.slice(lastIndex , match.index).trim()
            if(text) segment.push({type: "text" , content: text})
        }

        const language = match[1] || null;
        const code = match[2].replace(/\n$/, "");
        
        segment.push({
            type: "code", 
            language: language, 
            content: code 
        })

        lastIndex = FENCE_RE.lastIndex;
    
    }

    if(lastIndex < reply.length){ 
        const text = reply.slice(lastIndex).trim(); 
        if(text) segment.push({type: "text" , content: text}) ; 
    }

    return segment 
} 


export function parseSegmentsStreaming(reply: string): Segment[] {
  const lastFence = reply.lastIndexOf("```");
  const closedAfter = reply.indexOf("```", lastFence + 3) !== -1;

  // If the final fence is unclosed, temporarily hide it from the parser
  if (lastFence !== -1 && !closedAfter) {
    const head = reply.slice(0, lastFence);
    return parseSegments(head);
  }
  return parseSegments(reply);
}
