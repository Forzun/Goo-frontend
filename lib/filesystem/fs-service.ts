import { WorkspaceConfig } from "@/types/workspace"

const CONFIG_PATH = ".localgoo/config.json"

export class FileSystemService {
  private rootHandle: FileSystemDirectoryHandle | null = null

  async selectWorkspace(): Promise<FileSystemDirectoryHandle> {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" })
    this.rootHandle = handle
    return handle
  }

  async restoreWorkspace(): Promise<FileSystemDirectoryHandle | null> {
    const store = await getHandleFromId("localgoo-workspace")
    if (!store || store.kind !== "directory") {
      return null
    }
    const handle = store as FileSystemDirectoryHandle
    let permission = await handle.queryPermission({ mode: "readwrite" })
    if (permission !== "granted") {
      try {
        permission = await handle.requestPermission({ mode: "readwrite" })
      } catch {
        return null
      }
    }
    if (permission !== "granted") {
      return null
    }
    this.rootHandle = handle
    return this.rootHandle
  }

  async persistWorkspaceHandle(): Promise<void> {
    if (!this.rootHandle) throw new Error("No workspace open")
    await saveHandlerToId("localgoo-workspace", this.rootHandle)
  }

  getRoot(): FileSystemDirectoryHandle {
    if (!this.rootHandle) throw new Error("No workspace  selected")
    return this.rootHandle
  }

  async initializeWorkspace(name: string): Promise<void> {
    this.getRoot()
    try {
      await this.ensureDir("daily")
      await this.ensureDir("projects")
      await this.ensureDir("tags")
      await this.ensureDir(".localgoo")

      if (!(await this.exists("user.md"))) {
        await this.writeFile(
          "user.md",
          `# User Memory\n\n## Preferences\n\n## Technical Context\n`
        )
      }

      if (!(await this.exists(CONFIG_PATH))) {
        const config: WorkspaceConfig = {
          version: 1,
          name: name,
          createdAt: new Date().toISOString(),
        }
        await this.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
      }
    } catch (error) {
      throw new Error("unable to initialize workspace", { cause: error })
    }
  }

  async readConfig(): Promise<WorkspaceConfig | null> {
    if (!(await this.exists(CONFIG_PATH))) return null
    const json = await this.readFile(CONFIG_PATH)
    return JSON.parse(json) as WorkspaceConfig
  }

  async readFile(path: string): Promise<string> {
    const { parent, name } = await this.resolveParent(path)
    const fh = await parent.getFileHandle(name)
    const file = await fh.getFile()
    return file.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    const { parent, name } = await this.resolveParent(path, true)
    const fh = await parent.getFileHandle(name, {
      create: true,
    })
    const w = await fh.createWritable()
    try {
      await w.write(content)
    } finally {
      await w.close()
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.resolve(path)
      return true
    } catch {
      return false
    }
  }

  async deleteDir(path: string): Promise<void> {
    const { parent, name } = await this.resolveParent(path)
    await parent.removeEntry(name, {
      recursive: true,
    })
  }

  async ensureDir(path: string): Promise<void> {
    const parts = path.split("/").filter(Boolean)
    let current = this.getRoot()
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true })
    }
  }

  async listDir(path: string): Promise<string[]> {
    const dir = await this.resolve(path)
    const name: string[] = []
    for await (const entry of (dir as FileSystemDirectoryHandle).values()) {
      if (entry.kind === "directory") name.push(entry.name)
    }
    return name.sort()
  }

  async listFiles(
    path: string
  ): Promise<{ name: string; size: number; modifiedAt: string }[]> {
    const dir = await this.resolve(path)
    const out: { name: string; size: number; modifiedAt: string }[] = []
    for await (const entry of (dir as FileSystemDirectoryHandle).values()) {
      if (entry.kind === "file") {
        const f = await (entry as FileSystemFileHandle).getFile()
        out.push({
          name: entry.name,
          size: f.size,
          modifiedAt: new Date(f.lastModified).toISOString(),
        })
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }

  // path resolves

  private async resolve(path: string): Promise<FileSystemHandle> {
    const parts = path.split("/").filter(Boolean)
    if (parts.length === 0) return this.getRoot()
    let current: FileSystemDirectoryHandle = this.getRoot()
    const last = parts.pop()!
    for (const part of parts) {
      current = await current.getDirectoryHandle(part)
    }
    try {
      return await current.getDirectoryHandle(last)
    } catch {
      return await current.getFileHandle(last)
    }
  }

  private async resolveParent(
    path: string,
    create = false
  ): Promise<{ parent: FileSystemDirectoryHandle; name: string }> {
    const parts = path.split("/").filter(Boolean)
    const name = parts.pop()
    if (!name) throw new Error(`Invalid path: "${path}"`)
    let current: FileSystemDirectoryHandle = this.getRoot()
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create })
    }
    return { parent: current, name }
  }
}

const IDB_NAME = "localgoo"
const IDB_STORE = "handles"

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

async function saveHandlerToId(
  key: string,
  handle: FileSystemHandle
): Promise<void> {
  const db = await idb()
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite")
    tx.objectStore(IDB_STORE).put(handle, key)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

async function getHandleFromId(key: string): Promise<FileSystemHandle | null> {
  const db = await idb()
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readonly")
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => res(req.result as FileSystemHandle | null)
    req.onerror = () => rej(req.error)
  })
}
