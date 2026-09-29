import type { Database } from "sql.js"
import { blobToFloat32, cosineSimilarity, float32ToBlob } from "./vector.util"

export class EmbeddingRepository {
  constructor(private db: Database) {}

  save(
    id: string,
    sourceType: "message" | "memory" | "file",
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

  search(queryVec: Float32Array, model: string, limit = 5) {
    const res = this.db.exec(
      "SELECT id, source_id, source_path, embedding FROM embeddings WHERE model = ?",
      [model]
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

