import type { FileSystemService } from "@/lib/filesystem/fs-service";
import { parse } from "next/dist/build/swc/generated-native";

const WORD_LIMIT = 2000;
const OLLAMA_URL = "http://localhost:11434";

function countWords(content: string): number {
  const cleanText = content
    .replace(/<!--[\s\(\S\)]*?-->/g, '') // Remove HTML comments
    .replace(/^#+\s+/gm, '')          // Remove headers (# Heading)
    .replace(/(!\[.*?\].*?)/g, '') // Remove images (![alt](url))
    .replace(/(\[.*?\].*?)/g, '\$1') // Keep link text, remove URL layout
    .replace(/[`*_\-]/g, '')          // Remove formatting like `, *, _, -
    .replace(/^\s*[:-]\s+/gm, '');

  const words = cleanText.match(/\S+/g);
  return words ? words.length : 0;
}

function parseJsonResponse(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned) as {
    active_memory: string
    active_summary: string
  }
}

export async function compactMemoryIfNeeded(
  fs: FileSystemService,
  memoryPath: string,
  archiveDir: string,
  model:string
): Promise<{
    compacted: boolean;
    wordCount: number;
    archivePath?: string;
}> {

  const currentMemory = await fs.readFile(memoryPath)
  const wordCount = countWords(currentMemory)

  if (wordCount <= WORD_LIMIT) {
    return {
      compacted: false,
      wordCount: wordCount
    }
  }

  const prompt = `
You are consolidating memory for a local-first AI workspace.

The current memory has ${wordCount} words and exceeds the ${WORD_LIMIT}-word limit.

Produce valid JSON with exactly these fields:
{
  "active_memory": "A compact replacement for memory.md",
  "archive_summary": "A concise archive of useful context that is too detailed or old for active memory"
}

Rules:
- Preserve important goals, decisions, preferences, corrections, constraints,
  unresolved questions, and next steps.
- Keep the active memory organized using these headings:
  # Conversation Memory
  ## Current goal
  ## Important context
  ## User preferences
  ## Decisions
  ## Open questions
  ## Next steps
  ## Archived context
- Keep active_memory below 1000 words.
- Preserve older but potentially useful details in archive_summary.
- Do not invent facts or store secrets.
- Do not discard important information merely to make the summary shorter.
- Return JSON only.

CURRENT MEMORY:
${currentMemory}
`;

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Memory compaction failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.message.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Ollama returned an empty memory summary");
  }

  const parsed = parseJsonResponse(content);
  const archiveSummary = parsed.active_summary
  const activeMemory = parsed.active_memory

  if (!activeMemory || !archiveSummary) {
    throw new Error("Memory compaction returned incomplete content");
  }

  if (countWords(activeMemory) >= WORD_LIMIT) {
    throw new Error("Replacement memory is still too large");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = `${archiveDir}/${timestamp}-memory.md`;

  await fs.ensureDir(archiveDir);
  await fs.writeFile(archivePath, archiveSummary)

  const savedArchive = await fs.readFile(archivePath);

  if (savedArchive.trim() !== archiveSummary) {
    throw new Error("Archive verification failed; original memory preserved");
  }


  // approach 1 is to add consolidating the old memory
  await fs.writeFile(memoryPath, activeMemory);

  // Verify the replacement.
  const savedMemory = await fs.readFile(memoryPath);

  if (
    !savedMemory.trim() ||
    savedMemory.trim() !== activeMemory
  ) {
    throw new Error(
      `Replacement verification failed. Recover the original from ${archivePath}`,
    );
  }

  return {
    compacted: true,
    wordCount: countWords(savedMemory),
    archivePath: archiveDir || "no path"
  }
}
