import { ulid } from "ulid"
import type { Database } from "sql.js"
import { Conversation, ConversationMessage, Project, Tag } from "@/types/workspace"

export class ProjectRepository {
  constructor(private db: Database) {}

  upsert(p: Omit<Project, "id"> & { id?: string }): Project {
    const id = p.id ?? ulid()
    try {
      this.db.run(
        `INSERT INTO projects (id, name, relative_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(relative_path) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at`,
        [id, p.name, p.relativePath, p.createdAt, p.updatedAt]
      )

      return { ...p, id }
    } catch (e: unknown) {
      throw new Error("Upsert failed", { cause: e })
    }
  }

  list(): Project[] {
    const res = this.db.exec("SELECT * FROM projects ORDER BY name")
    return rowObjects<Project>(res)
  }

  getByPath(relativePath: string): Project | null {
    const res = this.db.exec("SELECT * FROM projects WHERE relative_path = ?", [
      relativePath,
    ])
    const row = rowObjects<Project>(res)
    return row[0] ?? null
  }

  remove(id: string): void {
    this.db.run("DELETE FROM projects WHERE id = ?", [id])
  }
}

export class ConversationRepository {
  constructor(private db: Database) {}

  upsert(c: {
    id?: string
    projectId: string
    title: string
    relativePath: string
  }): Conversation {
    const id = c.id ?? ulid()
    const now = new Date().toISOString()

    try {
      this.db.run(
        `INSERT INTO conversations (id, project_id, title, relative_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(relative_path) DO UPDATE SET title=excluded.title, updated_at=excluded.updated_at`,
        [id, c.projectId, c.title, c.relativePath, now, now]
      )

      return {
        id: id,
        projectId: c.projectId,
        title: c.title,
        relativePath: c.relativePath,
        metaData: {
          id: id,
          title: c.title,
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
          userMessageCount: 0,
          assistantMessageCount: 0,
        },
        messages: [],
      }
    } catch (err) {
      throw new Error("Upsert failed", { cause: err })
    }
  }

  listByProject(projectId: string): Conversation[] {
    const res = this.db.exec(
      `
        SELECT * FROM conversations WHERE project_id = ? ORDER BY created_at DESC
      `,
      [projectId]
    )

    return rowObjects<any>(res).map((r) => ({
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      relativePath: r.relativePath,
      metaData: {
        id: r.id,
        title: r.title,
        createdAt: r.createdAt,
        messageCount: r.messageCount,
        userMessageCount: r.userMessageCount,
        assistantMessageCount: r.assistantMessageCount,
        updatedAt: r.updatedAt,
      },
      messages: [],
    }))
  }

  get(id: string): Conversation | null {
    const res = this.db.exec(`SELECT * FROM conversations WHERE id = ?`, [id])

    const row = rowObjects<any>(res)

    if (!row[0]) return null

    const r = row[0]

    return {
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      relativePath: r.relativePath,
      metaData: {
        id: r.id,
        title: r.title,
        createdAt: r.createdAt,
        messageCount: r.messageCount,
        userMessageCount: r.userMessageCount,
        assistantMessageCount: r.assistantMessageCount,
        updatedAt: r.updatedAt,
      },
      messages: [],
    }
  }

  updateCounts(
    id: string,
    userCount: number,
    assistantMessageCount: number
  ): void {
    const total = userCount + assistantMessageCount

    this.db.run(
      "UPDATE conversations SET message_count=?, user_message_count=?, assistant_message_count=?, updated_at=? WHERE id=?",
      [total, userCount, assistantMessageCount, new Date().toISOString(), id]
    )
  }

  remove(id: string): void {
    this.db.run("DELETE FROM conversations WHERE id = ?", [id])
  }
}

export class MessageRepository {
  constructor(private db: Database) {}

  replaceAll(conversationId: string, messages: ConversationMessage[]): void {
    this.db.run("DELETE FROM messages WHERE conversation_id = ?", [
      conversationId,
    ])

    messages.forEach((m, i) =>
      this.db.run(
        "INSERT INTO messages (id, conversation_id, role, content_preview, block_index, created_at) VALUES (?,?,?,?,?,?)",
        [m.id, conversationId, m.role, m.content.slice(0, 200), i, m.createdAt]
      )
    )
  }

  listByConversation(conversationId: string): ConversationMessage[] {
    const res = this.db.exec(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY block_index",
      [conversationId]
    )

    return rowObjects<any>(res).map((r) => ({
      id: r.id,
      role: r.role,
      content: r.contentPreview,
      createdAt: r.createdAt,
    }))
  }
}

export class TagRepository {
  
  constructor(private db: Database){}
 
  ensure(name: string): Tag{ 
    const existing = this.getByName(name)
    if(existing) return existing

    const id = ulid()
    const now = new Date().toISOString()
  
    this.db.run("INSERT INTO tags (id, name, created_at) VALUES (?,?,?)", [id, name, new Date().toISOString()]);

    return { id, name, createdAt: now }
  }
 
  getByName(name: string): Tag | null{ 
    const res = this.db.exec("SELECT * FROM tags WHERE name= ?", [name])
    const row = rowObjects<Tag>(res)
    return row[0] ?? null
  }
 
  
  list(): Tag[]{
    const res = this.db.exec("SELECT * FROM tags");
    return rowObjects<Tag>(res);
  }

  setForConversation(conversationId: string, tagNames: string[]): void {
    this.db.run("DELETE FROM conversation_tags WHERE conversation_id = ?", [conversationId]);
    for (const name of tagNames) {
      const tag = this.ensure(name);
      this.db.run(
        "INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id) VALUES (?,?)",
        [conversationId, tag.id],
      );
    }
  }

  getForConversation(conversationId: string): Tag[] {
    const res = this.db.exec(
      `SELECT t.* FROM tags t
       JOIN conversation_tags ct ON ct.tag_id = t.id
       WHERE ct.conversation_id = ?`, [conversationId],
    );
    return rowObjects<Tag>(res);
  }
  
}

export class FileRepository { 

  constructor(private db: Database) {}

 upsert(f: {relativePath: string, type:string, size: number, modifiedAt: string}): void{ 
    try{
      this.db.run(
      `INSERT INTO files (id, relative_path, type, size, modified_at) VALUES (?,?,?,?,?)
       ON CONFLICT(relative_path) DO UPDATE SET size=excluded.size, modified_at=excluded.modified_at`,
      [ulid(), f.relativePath, f.type, f.size, f.modifiedAt],
    );
    } catch(e: unknown){ 
      throw new Error("Upsert failed", { cause: e });
    }

  } 

  removeStale(validPaths: Set<string>): void {
    const existing = rowObjects<{ relativePath: string }>(this.db.exec("SELECT relative_path FROM files"));
    for (const row of existing) {
      if (!validPaths.has(row.relativePath)) {
        this.db.run("DELETE FROM files WHERE relative_path = ?", [row.relativePath]);
      }
    }
  }

}


function rowObjects<T>(
  result: { columns: string[]; values: unknown[][] }[]
): T[] {
  if (!result.length) return []

  const { columns, values } = result[0]

  return values.map(
    (v) =>
      Object.fromEntries(columns.map((c, i) => [snakeToCamel(c), v[i]])) as T
  )
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}