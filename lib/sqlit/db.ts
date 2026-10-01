import initSqlJs, { type Database, type SqlJsStatic } from "sql.js"

let dbInstance: Database | null = null

// Serializes load/init operations so concurrent calls can't interleave
// (e.g. one caller closing a DB another caller just installed).
let loadChain: Promise<unknown> = Promise.resolve()

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = loadChain.then(fn, fn)
  loadChain = run.catch(() => undefined)
  return run
}

const MIGRATIONS = `
       CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  relative_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  user_message_count INTEGER NOT NULL DEFAULT 0,
  assistant_message_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content_preview TEXT NOT NULL DEFAULT '',
  block_index INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  relative_path TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  modified_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK(source_type IN ('message','memory','file')),
  source_id TEXT NOT NULL,           -- message.id, or "project:xyz" for memory, or files.id
  source_path TEXT NOT NULL,         -- filesystem path for rebuilds
  model TEXT NOT NULL,               -- "nomic-embed-text" etc.
  dimension INTEGER NOT NULL,        -- 384, 768, 1024...
  embedding BLOB NOT NULL,           -- Float32Array stored as bytes
  content_hash TEXT NOT NULL,        -- sha256 of content, to detect changes
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);     
`

function enableForeignKey(db: Database): void {
  db.exec("PRAGMA foreign_keys = ON;")
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`, // serves from /public/sql-wasm.wasm
  })
  dbInstance = new SQL.Database()
  enableForeignKey(dbInstance);
  dbInstance.exec(MIGRATIONS)
  return dbInstance
}

/** Load existing .db file from workspace, or return fresh in-memory db. */
export async function loadDbFromFiles(bytes: Uint8Array | null): Promise<Database> {
  return serialize(async () => {
    if (bytes && bytes.length > 0) {
      const SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`,
      })
      // Open + migrate the new DB *before* touching the current one, so a
      // corrupt file or failed migration never leaves us with a closed DB.
      const next = openDatabase(SQL, bytes)
      const prev = dbInstance
      dbInstance = next
      if (prev) prev.close()
      return next
    }
    // get new one
    return getDb()
  })
}

function openDatabase(SQL: SqlJsStatic, bytes: Uint8Array): Database {
  let db: Database | null = null
  try {
    db = new SQL.Database(bytes)
    enableForeignKey(db)
    db.exec(MIGRATIONS)
    return db
  } catch (err) {
    db?.close()
    throw err
  }
}

export function exportDb(): Uint8Array {
    if (!dbInstance) throw new Error("DB not initialized");
    return dbInstance.export()
}


