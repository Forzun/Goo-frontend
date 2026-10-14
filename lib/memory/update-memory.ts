import { getDb } from "@/lib/sqlit/db"
import { processConversationMemory } from "@/lib/memory/process-conversation-memory"
import { workspaceService } from "@/features/workspace/workspace-service"
import { MEMORY_EXTRATION } from "../prompt/memory-extraction"
import { MEMORY_UPDATE } from "../prompt/memory-update"
import { indexMarkdownMemory } from "../embedding/memory-embedding"
import { EmbeddingRepository } from "../embedding/embedding-repository"

const embeddingModel = "nomic-embed-text"

export async function updateConversationMemory(
  conversationId: string,
  model: string
): Promise<{
  processed: boolean
  processedUserMessages: number
}> {
  const { conversation, data } =
    await workspaceService.getConversation(conversationId)

    const db = await getDb()
    const repository = new EmbeddingRepository(db)

  const processed = await processConversationMemory({
    db,
    fs: workspaceService.fs,
    conversationId,
    memoryPath: `${conversation.relativePath}/memory.md`,
    messages: data.messages,
    model,
    prompts: {
      extraction: MEMORY_EXTRATION,
      update: MEMORY_UPDATE,
    },
  })

  if (processed.processed) {
    try {
      const result = await indexMarkdownMemory(
        workspaceService.fs,
        `${conversation.relativePath}/memory.md`,
        repository,
        embeddingModel
      )

      console.log("memory embeddings indexed:", result)
    } catch (error) {
      console.error("Failed to index memory embeddings:", error)
    } finally {
      // Persist even if indexing failed — the checkpoint and any partial
      // embedding rows live only in the in-memory sql.js DB and disappear
      // on the next loadDbFromFiles otherwise.
      try {
        await workspaceService.persistDb()
      } catch (error) {
        console.error("Failed to persist DB after memory update:", error)
      }
    }
  } else {
    console.log("memory update skipped (no new user messages):", processed)
  }

  return {
    processed: processed.processed,
    processedUserMessages: processed.processedUserMessages,
  }
}
