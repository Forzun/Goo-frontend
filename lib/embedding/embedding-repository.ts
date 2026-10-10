import type { Database } from "sql.js"
import { blobToFloat32, cosineSimilarity, float32ToBlob } from "./vector.util"
import { SquareArrowOutUpLeft } from "lucide-react";

export type EmbeddingSourceType = "message" | "memory" | "file";

export class EmbeddingRepository {
  constructor(private db: Database) {}

  save(
    id: string,
    sourceType: EmbeddingSourceType,
    sourceId: string,
    sourcePath: string,
    model: string,
    vector: Float32Array,
    contentHash: string
  ): void {
    const blob = float32ToBlob(vector)

    this.db.run(
      `INSERT OR REPLACE INTO embeddings
       (id, source_type, source_id, source_path, model, dimension, embedding, content_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sourceType,
        sourceId,
        sourcePath,
        model,
        vector.length,
        blob,
        contentHash,
        new Date().toISOString(),
      ]
    )
  }

  listBySource(
    sourceType: EmbeddingSourceType,
    sourecPath: string,
    model: string
  ) {
    const result = this.db.exec(`
        SELECT id, source_id AS sourceId, content_hash AS contentHash
        FROM embeddings
        WHERE source_type = ? AND source_path = ? AND model = ?`,
      [model, sourceType, sourecPath]
    )

    if (!result.length) {
      return []
    }

    return result[0].values.map((row) => {
      id: String(row[0]);
      sourceType: String(row[1]);
      sourcePath: String(row[2]);
    })
  }

  searchBySourceType(queryVec: Float32Array, model: string, limit = 5, sourceType: EmbeddingSourceType) {
    const res = this.db.exec(
      `SELECT id, source_id, source_path, embedding
       FROM embeddings
       WHERE model = ? AND source_type = ?`,
      [model , sourceType]
    )

    if (!res.length) {
      return []
    }

    const { columns, values } = res[0]
    const embeddingIdx = columns.indexOf("embedding")

    // convert all blob into float32Array
    const scored = values.map((row) => {
      const blob = row[embeddingIdx] as Uint8Array
      const vec = blobToFloat32(blob)

      return {
        id: row[columns.indexOf("id")] as string,
        sourceId: row[columns.indexOf("source_id")] as string,
        sourcePath: row[columns.indexOf("source_path")] as string,
        score: cosineSimilarity(queryVec, vec),
      }
    })

    // todo:-> we are fetching all the embedding from db which make it extremly slow with big data
    return scored.sort((a, b) => b.score - a.score).slice(0, limit)
  }
}
