import type { FileSystemService } from "@/lib/filesystem/fs-service";
import { EmbeddingRepository } from "../embedding/embedding-repository";
import { generateEmbedding } from "../ollama";

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

  console.log(results)
  // 3. Keep only sufficiently relevant results.
  const relevantResults = results.filter(
    (result) => result.score >= MIN_SIMILARITY,
  );

  if (!relevantResults.length) {
    return "";
  }

  // 4. Read the relevant Markdown files and retrieve their chunks.
  const fileCache = new Map<string, string[]>();

  const chunks = await Promise.all(
    relevantResults.map(async (result) => {
      let fileChunks = fileCache.get(result.sourcePath);

      if (!fileChunks) {
        const markdown = await fs.readFile(result.sourcePath);
        fileChunks = markdown
          .split(/\n(?=#{1,6}\s)/)
          .map((chunk) => chunk.trim())
          .filter(Boolean);

        fileCache.set(result.sourcePath, fileChunks);
      }

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
