import { ulid } from "ulid"
import type { Database } from "sql.js"
import { Conversation, Project } from "@/types/workspace"

export class ProjectRepository {
  constructor(private db: Database) {}

  upsert(p: Omit<Project , "id"> & {id?: string}): Project{ 
    const id = p.id ?? ulid();
    try{ 
    this.db.run(
      `INSERT INTO projects (id, , relative_path, created_at, nameupdated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(relative_path) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at`,
      [id, p.name, p.relativePath, p.createdAt, p.updatedAt],
    );

    return { ...p , id}
    }catch(e: unknown){ 
      throw new Error("Upsert failed", {cause:e})
    }
  }

  list(): Project[] {
    const res = this.db.exec("SELECT * FROM projects ORDER BY name")
    return rowObjects<Project>(res)
  }

  getByPath(relativePath: string): Project | null { 
    const res = this.db.exec("SELECT * FROM projects WHERE relative_path = ?", [relativePath])
    const row = rowObjects<Project>(res);
    return row[0] ?? null
  }

  remove(id: string): void { 
    this.db.run("DELETE FROM projects WHERE id = ?", [id])
  }
}


export class ConversationRepository {  
  constructor(private db: Database){} 

  upsert(c: {
    id?:string, 
    projectId: string, 
    title: string
    relativePath: string, 
  }): Conversation{
    const id = c.id ?? ulid(); 
    const now = new Date().toISOString();

    try{
    this.db.run(
      `INSERT INTO conversations (id, project_id, title, relative_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(relative_path) DO UPDATE SET title=excluded.title, updated_at=excluded.updated_at`,
      [id, c.projectId, c.title, c.relativePath, now, now],
    );
 
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
        assistantMessageCount: 0  
      }, 
      messages: []
     }
    }catch(err){
    throw new Error("Upsert failed", {cause:err})
  }
  }

  listByProject(projectId: string): Conversation[]{ 
    const res = this.db.exec(`
        SELECT * FROM conversations WHERE project_id = ? ORDER BY created_at DESC
      `, [projectId])  

      return rowObjects<any>(res).map((r) => ({ 
         id: r.id , projectId: r.project_id , title: r.title , relativePath: r.relative_path, 
         metaData: { 
            id: r.id, 
            title: r.title, 
            createdAt: r.created_at, 
            messageCount: r.messageCount,
            userMessageCount: r.userMessageCount, 
            assistantMessageCount: r.assistantMessageCount, 
            updatedAt: r.updatedAt, 
         },
         messages: [],
      })) 
  }

  get(id: string): Conversation | null{ 
    const res = this.db.exec(`SELECT * FROM conversations WHERE id = ?`, [id])

    const row = rowObjects<any>(res)

    if(!row[0]) return null; 

    const r = row[0];

    return { 
      id: r.id, 
      projectId: r.id,
      title: r.title, 
      relativePath: r.relativePath,
      metaData: { 
            id: r.id, 
            title: r.title, 
            createdAt: r.created_at, 
            messageCount: r.messageCount,
            userMessageCount: r.userMessageCount, 
            assistantMessageCount: r.assistantMessageCount, 
            updatedAt: r.updatedAt, 
         },  
         messages: [],
    }
  }

  updateCounts(){ 

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
  const res = s
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace("-", "").replace("_", "")
    )

  return res
}
