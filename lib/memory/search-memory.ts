import type { FileSystemService } from "@/lib/filesystem/fs-service";
import { EmbeddingRepository } from "../embedding/embedding-repository";
import { generateEmbedding } from "../ollama";
import { chunkMarkdown } from "../embedding/memory-embedding";

const EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_LIMIT = 2;
const MIN_SIMILARITY = 0.3;

export async function searchRelevantMemory(
  query: string,
  repository: EmbeddingRepository,
  fs: FileSystemService,
  limit = DEFAULT_LIMIT,
): Promise<string> {
  if (!query.trim()) return "";

  if (typeof fs.hasWorkspace === "function" && !fs.hasWorkspace()) {
    return "";
  }

  // 1. Generate an embedding for the user's message.
  const queryVector = await generateEmbedding(
    EMBEDDING_MODEL,
    query,
  );

  // 2. Search existing memory embeddings in SQLite.
  const results = repository.searchBySourceType(
    queryVector,
    EMBEDDING_MODEL,
    limit,
    "memory",
  );

  // 3. Keep only sufficiently relevant results.
  const relevantResults = results.filter(
    (result) => result.score >= MIN_SIMILARITY,
  );

  if (!relevantResults.length) {
    return "";
  }

  // 4. Read the relevant Markdown files and retrieve their chunks.
  const fileCache = new Map<string, string[] | null>();

  const chunks = await Promise.all(
    relevantResults.map(async (result) => {
      let fileChunks = fileCache.get(result.sourcePath);

      if (fileChunks === undefined) {
        try {
          const markdown = await fs.readFile(result.sourcePath);
          fileChunks = chunkMarkdown(markdown);
          fileCache.set(result.sourcePath, fileChunks);
        } catch (err) {
          // File does not exist on disk or cannot be read.
          fileCache.set(result.sourcePath, null);
          try {
            repository.deleteBySourcePath(result.sourcePath);
          } catch {
            // Ignore DB deletion errors
          }
          return "";
        }
      }

      if (!fileChunks) return "";

      const marker = "::chunk:";
      const markerIndex = result.sourceId.lastIndexOf(marker);

      if (markerIndex === -1) return "";

      const chunkIndex = Number(
        result.sourceId.slice(markerIndex + marker.length),
      );

      if (!Number.isInteger(chunkIndex)) return "";

      return fileChunks[chunkIndex] ?? "";
    }),
  );

  // 5. Return only the retrieved context.
  return chunks
    .filter(Boolean)
    .join("\n\n---\n\n");
}
