import type { Database } from "sql.js";
import { ulid } from "ulid";

import { FileSystemService } from "@/lib/filesystem/fs-service";
import { generateEmbedding } from "@/lib/ollama"

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
  params: unknown[] = [],
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
export async function searchMemories(
  fs: FileSystemService,
  db: Database,
  query: string,
  model: string,
  limit = 5,
  minScore = 0.25,
): Promise<RetrievedMemory[]> {
  if (!query.trim() || limit <= 0) return [];

  const queryVector = await generateEmbedding(query, model);

  const stored = queryRows<StoredEmbedding>(
    db,
    `SELECT
       id,
       source_id,
       source_path,
       model,
       dimension,
       embedding,
       content_hash
     FROM embeddings
     WHERE source_type = ? AND model = ?`,
    [SOURCE_TYPE, model],
  );

  const ranked = stored
    .map((row) => {
      const vector = bytesToVector(row.embedding);

      return {
        row,
        score: cosineSimilarity(queryVector, vector),
      };
    })
    .filter(
      (item) =>
        item.score >= minScore &&
        item.row.dimension === queryVector.length,
    )
    .sort((a, b) => b.score - a.score);

  const fileCache = new Map<string, string[]>();
  const results: RetrievedMemory[] = [];

  for (const candidate of ranked) {
    if (results.length >= limit) break;

    const { row, score } = candidate;

    let chunks = fileCache.get(row.sourcePath);

    if (!chunks) {
      try {
        const markdown = await fs.readFile(row.sourcePath);
        chunks = chunkMarkdown(markdown);
        fileCache.set(row.sourcePath, chunks);
      } catch {
        // The Markdown file may have been deleted or moved.
        continue;
      }
    }

    const match = row.sourceId.match(/::chunk:(\d+)$/);

    if (!match) continue;

    const index = Number(match[1]);
    const content = chunks[index];

    if (!content) continue;

    // Ignore stale embeddings if the source file changed after indexing.
    const currentHash = await hashText(content);

    if (currentHash !== row.contentHash) continue;

    results.push({
      sourceId: row.sourceId,
      sourcePath: row.sourcePath,
      content,
      score,
    });
  }

  return results;
}
