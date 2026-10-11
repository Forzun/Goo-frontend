import type { Database } from "sql.js";
import { ulid } from "ulid";

import { FileSystemService } from "@/lib/filesystem/fs-service";
import { generateEmbedding } from "@/lib/ollama"
import { EmbeddingRepository } from "./embedding-repository";

const CHUNK_OVERLAP = 60;
const SOURCE_TYPE = "memory";
const CHUNK_SIZE = 1000;

interface ExistingEmbedding {
  id: string;
  sourceId: string;
  contentHash: string;
}

interface StoredEmbedding {
  id: string;
  sourceId: string;
  sourcePath: string;
  model: string;
  dimension: number;
  embedding: Uint8Array;
  contentHash: string;
}

export interface RetrievedMemory {
  sourceId: string;
  sourcePath: string;
  content: string;
  score: number;
}

interface PendingEmbedding {
  sourceId: string;
  content: string;
  contentHash: string;
  vector: number[];
}

function queryRows<T>(
  db: Database,
  sql: string,
  params: string[] = [],
): T[] {
  const result = db.exec(sql, params);

  if (!result.length) return [];

  const { columns, values } = result[0];

  return values.map((values) => {
    const row: Record<string, unknown> = {};

    columns.forEach((column, index) => {
      const camelCase = column.replace(
        /_([a-z])/g,
        (_, letter: string) => letter.toUpperCase(),
      );

      row[camelCase] = values[index];
    });

    return row as T;
  });
}

/**
 * Remove YAML frontmatter before embedding the Markdown body.
 */
function removeFrontmatter(markdown: string): string {
  const normalized = markdown.trim();

  if (!normalized.startsWith("---")) {
    return normalized;
  }

  const match = normalized.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);

  if (!match) return normalized;

  return normalized.slice(match[0].length).trim();
}

/**
 * Split Markdown into chunks while preserving headings where possible.
 */
export function chunkMarkdown(
  markdown: string,
  maxChars = CHUNK_SIZE,
): string[] {
  const body = removeFrontmatter(markdown);

  if (!body.trim()) return [];

  const sections = body.split(/(?=^#{1,3}\s)/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const normalized = section.trim();

    if (!normalized) continue;

    if (normalized.length <= maxChars) {
      chunks.push(normalized);
      continue;
    }

    // Split long sections into paragraphs.
    const paragraphs = normalized.split(/\n\s*\n/);
    let current = "";

    for (const paragraph of paragraphs) {
      const parts: string[] = [];

      // Handle a single paragraph larger than the chunk limit.
      if (paragraph.length > maxChars) {
        for (let i = 0; i < paragraph.length; i += maxChars) {
          parts.push(paragraph.slice(i, i + maxChars));
        }
      } else {
        parts.push(paragraph);
      }

      for (const part of parts) {
        const next = current ? `${current}\n\n${part}` : part;

        if (next.length > maxChars && current) {
          chunks.push(current.trim());
          current = part;
        } else {
          current = next;
        }
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }
  }

  return chunks.filter(Boolean);
}

async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Store Float32 vectors as SQLite BLOBs.
 * Explicit little-endian encoding makes serialization predictable.
 */

function vectorToBytes(vector: number[]): Uint8Array {
  const bytes = new Uint8Array(vector.length * 4);
  const view = new DataView(bytes.buffer);

  vector.forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
  });

  return bytes;
}

function bytesToVector(bytes: Uint8Array): number[] {
  if (bytes.byteLength % 4 !== 0) {
    throw new Error("Invalid embedding BLOB size");
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );

  const vector: number[] = [];

  for (let offset = 0; offset < bytes.byteLength; offset += 4) {
    vector.push(view.getFloat32(offset, true));
  }

  return vector;
}

/**
 * Index one Markdown memory file.
 *
 * Existing chunks with unchanged content are not re-embedded.
 * Changed chunks are embedded before the database is modified.
 */
export async function indexMemoryFile(
  fs: FileSystemService,
  db: Database,
  sourcePath: string,
  model: string,
): Promise<{
  indexed: number;
  unchanged: number;
  removed: number;
}> {
  const markdown = await fs.readFile(sourcePath);
  const chunks = chunkMarkdown(markdown);

  const existing = queryRows<ExistingEmbedding>(
    db,
    `SELECT id, source_id, content_hash
     FROM embeddings
     WHERE source_type = ? AND source_path = ? AND model = ?`,
    [SOURCE_TYPE, sourcePath, model],
  );

  const existingBySource = new Map(
    existing.map((entry) => [entry.sourceId, entry]),
  );

  const pending: PendingEmbedding[] = [];
  const validSourceIds = new Set<string>();

  let unchanged = 0;

  // Generate embeddings before making any database changes.
  for (const [index, content] of chunks.entries()) {
    const sourceId = `${sourcePath}::chunk:${index}`;
    const contentHash = await hashText(content);

    validSourceIds.add(sourceId);

    const previous = existingBySource.get(sourceId);

    if (previous?.contentHash === contentHash) {
      unchanged++;
      continue;
    }

    const vector = await generateEmbedding(content, model);

    pending.push({
      sourceId,
      content,
      contentHash,
      vector,
    });
  }

  // Ensure all new vectors use the same dimension.
  const dimensions = new Set(pending.map((item) => item.vector.length));

  if (dimensions.size > 1) {
    throw new Error("Embedding dimensions differ within the same model");
  }

  let removed = 0;

  db.run("BEGIN TRANSACTION");

  try {
    for (const item of pending) {
      const previous = existingBySource.get(item.sourceId);

      if (previous) {
        db.run("DELETE FROM embeddings WHERE id = ?", [previous.id]);
      }

      db.run(
        `INSERT INTO embeddings (
          id,
          source_type,
          source_id,
          source_path,
          model,
          dimension,
          embedding,
          content_hash,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ulid(),
          SOURCE_TYPE,
          item.sourceId,
          sourcePath,
          model,
          item.vector.length,
          vectorToBytes(item.vector),
          item.contentHash,
          new Date().toISOString(),
        ],
      );
    }

    // Remove chunks that no longer exist in the Markdown file.
    for (const previous of existing) {
      if (!validSourceIds.has(previous.sourceId)) {
        db.run("DELETE FROM embeddings WHERE id = ?", [previous.id]);
        removed++;
      }
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  return {
    indexed: pending.length,
    unchanged,
    removed,
  };
}

/**
 * Search indexed Markdown memories using cosine similarity.
 *
 * The original text is read from Markdown, not from SQLite.
 */

interface WorkspaceReader {
  readFile(path: string): Promise<string>;
}

//first read memory.md file
export async function indexMarkdownMemory(
  fs: WorkspaceReader,
  sourcePath: string,
  repository: EmbeddingRepository,
  model: string
) {
  const markdown = await fs.readFile(sourcePath)
  const chunks = chunkMarkdown(markdown);

  const previous = repository.listBySource(
    "memory", sourcePath, model
  )

  const previousSourceId = new Map(
    previous.map((item) => [item.sourceId, item])
  )

 const currentSourceIds = new Set<string>()

 let indexed = 0;
 let skipped = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const sourceId = `${sourcePath}::chunk:${i}`;
    const id = `memory:${sourcePath}:${i}:${model}`;
    const contentHash = await hashText(chunk);

    currentSourceIds.add(sourceId);

    const existing = previousSourceId.get(sourceId)

    if (existing?.contentHash === contentHash) {
      skipped++;
      continue;
    }

    if (existing) {
      repository.deleteById(existing.id)
    }

    const vector = await generateEmbedding(chunk, model);

    repository.save(
      id,
      "memory",
      sourceId,
      sourcePath,
      model,
      vector,
      contentHash
    );

    indexed++
  }

  for (const oldChunk of previous) {
    if (!currentSourceIds.has(oldChunk.sourceId)) {
      repository.deleteById(oldChunk.id);
    }
  }

  return { indexed, skipped };
}
export async function searchMemory(
  fs: WorkspaceReader,
  repository: EmbeddingRepository,
  query: string,
  memoryPaths: string[],
  model: string,
  limit = 5
) {
  // Indexing is incremental: unchanged chunks are not re-embedded.
  for (const path of memoryPaths) {
    await indexMarkdownMemory(fs, path ,repository, model);
  }

  const queryVector = await generateEmbedding(query, model);

  const results = repository.searchBySourceType(
    queryVector,
    model,
    limit,
    "memory"
  );

  // Retrieve the original Markdown chunks.
  const chunkCache = new Map<string, string[]>();

  return Promise.all(
    results.map(async (result) => {
      let chunks = chunkCache.get(result.sourcePath);

      if (!chunks) {
        const markdown = await fs.readFile(result.sourcePath);
        chunks = chunkMarkdown(markdown);
        chunkCache.set(result.sourcePath, chunks);
      }

      const marker = "::chunk:";
      const position = result.sourceId.lastIndexOf(marker);
      const chunkIndex = Number(
        result.sourceId.slice(position + marker.length)
      );

      return {
        ...result,
        content: chunks[chunkIndex] ?? "",
      };
    })
  );
}
