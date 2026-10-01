import { FileSystemService } from "@/lib/filesystem/fs-service";
import { getDb, loadDbFromFiles , exportDb } from "@/lib/sqlit/db";
import {
  ProjectRepository,
  ConversationRepository,
  MessageRepository,
  TagRepository,
  FileRepository,
} from "@/lib/sqlit/repository";
import {
  serializeConversation,
  parseConversation,
  createEmptyConversation,
  appendMessageToConversation,
} from "@/lib/memory/conversation-json";
import { ulid } from "ulid";
import type { Conversation, ConversationData, ConversationMessage, ConversationMetadata, Project } from "@/types/workspace";

export class WorkspaceService {
  fs = new FileSystemService();
  private projects!: ProjectRepository;
  private conversations!: ConversationRepository;
  private messages!: MessageRepository;
  private tags!: TagRepository;
  private files!: FileRepository;

  // ── open / init (unchanged logic) ────────────────────────────────

  async open(): Promise<"restored" | "new"> {
    const restored = await this.fs.restoreWorkspace();
    if (restored) {
      await this.initDb();
      return "restored";
    }
    return "new";
  }

  async selectAndInit(name: string): Promise<void> {
    await this.fs.selectWorkspace();
    await this.fs.initializeWorkspace(name);
    await this.fs.persistWorkspaceHandle();
    await this.initDb();
  }

  private async initDb(): Promise<void> {
    let existing: Uint8Array | null = null;
    if (await this.fs.exists(".localgoo/localgoo.db")) {
      const dir = await this.fs.getRoot().getDirectoryHandle(".localgoo");
      const fh = await dir.getFileHandle("localgoo.db");
      const file = await fh.getFile();
      existing = new Uint8Array(await file.arrayBuffer());
    }

    const db = await loadDbFromFiles(existing);
    this.projects = new ProjectRepository(db);
    this.conversations = new ConversationRepository(db);
    this.messages = new MessageRepository(db);
    this.tags = new TagRepository(db);
    this.files = new FileRepository(db);
    await this.rebuildIndex();
    await this.persistDb();
  }

  async persistDb(): Promise<void> {
    const bytes = exportDb();
    const fh = await (await this.fs.getRoot().getDirectoryHandle(".localgoo")).getFileHandle(
      "localgoo.db",
      { create: true },
    );

    // const safeBytes = new Uint8Array(bytes)
    const w = await fh.createWritable();
    await w.write(bytes);
    await w.close();
  }

  // ── Indexing: reads conversation.json now ────────────────────────

  async rebuildIndex(): Promise<void> {
    const projectDirs = await this.fs.listDir("projects");
    const seenPaths = new Set<string>();

    for (const dirName of projectDirs) {
      const relPath = `projects/${dirName}`;
      seenPaths.add(relPath);
      const now = new Date().toISOString();
      const project = this.projects.upsert({
        name: dirName,
        relativePath: relPath,
        createdAt: now,
        updatedAt: now,
      });

      const convDirs = await this.fs.listDir(`${relPath}/conversations`);
      for (const convDir of convDirs) {
        const convRel = `${relPath}/conversations/${convDir}`;
        seenPaths.add(convRel);

        const jsonRaw = await this.fs
          .readFile(`${convRel}/conversation.json`)
          .catch(() => null);

        if (!jsonRaw) continue; // skip dirs without conversation.json

        const data = parseConversation(jsonRaw);
        const conv = this.conversations.upsert({
          id: data.id || convDir,
          projectId: project.id,
          title: data.title,
          relativePath: convRel,
        });

        this.messages.replaceAll(conv.id, data.messages);
        this.conversations.updateCounts(
          conv.id,
          data.userMessageCount,
          data.assistantMessageCount,
        );
      }
    }

    // Remove stale SQLite rows
    for (const p of this.projects.list()) {
      if (!seenPaths.has(p.relativePath)) this.projects.remove(p.id);
    }
  }

  // ── Project CRUD (unchanged) ─────────────────────────────────────

  async createProject(name: string): Promise<Project> {
    const relPath = `projects/${name}`;
    await this.fs.ensureDir(`${relPath}/conversations`);
    await this.fs.ensureDir(`${relPath}/files`);
    await this.fs.writeFile(`${relPath}/memory.md`, `# ${name} Memory\n`);
    const now = new Date().toISOString();
    const p = this.projects.upsert({
      name,
      relativePath: relPath,
      createdAt: now,
      updatedAt: now,
    });
    await this.persistDb();
    return p;
  }

  async renameProject(id: string, newName: string): Promise<void> {
    const p = this.projects.list().find((x) => x.id === id);
    if (!p) throw new Error("Project not found");
    const newRel = `projects/${newName}`;
    await this.fs.ensureDir(newRel);
    const convs = this.conversations.listByProject(id);
    for (const c of convs) {
      const newConvRel = `${newRel}/conversations/${c.id}`;
      await this.fs.ensureDir(newConvRel);
      // Copy conversation.json + memory.md only
      const convJson = await this.fs.readFile(`${c.relativePath}/conversation.json`);
      await this.fs.writeFile(`${newConvRel}/conversation.json`, convJson);
      const mem = await this.fs.readFile(`${c.relativePath}/memory.md`).catch(() => "");
      await this.fs.writeFile(`${newConvRel}/memory.md`, mem);
    }
    const projMem = await this.fs.readFile(`${p.relativePath}/memory.md`).catch(() => "");
    await this.fs.writeFile(`${newRel}/memory.md`, projMem);
    await this.fs.deleteDir(p.relativePath);
    this.projects.remove(id);
    const now = new Date().toISOString();
    this.projects.upsert({ name: newName, relativePath: newRel, createdAt: now, updatedAt: now });
    await this.rebuildIndex();
    await this.persistDb();
  }

  async deleteProject(id: string): Promise<void> {
    const p = this.projects.list().find((x) => x.id === id);
    if (!p) return;
    await this.fs.deleteDir(p.relativePath);
    this.projects.remove(id);
    await this.persistDb();
  }

  listProjects(): Project[] {
    return this.projects.list();
  }

  // ── Conversation CRUD ────────────────────────────────────────────

  async createConversation(projectId: string, title: string): Promise<Conversation> {
    const project = this.projects.list().find((p) => p.id === projectId);
    if (!project) throw new Error("Project not found");

    const id = ulid();
    const relPath = `${project.relativePath}/conversations/${id}`;
    await this.fs.ensureDir(relPath);

    const data = createEmptyConversation(id, projectId, title);

    await this.fs.writeFile(
      `${relPath}/conversation.json`,
      serializeConversation(data),
    );
    await this.fs.writeFile(
      `${relPath}/memory.md`,
      `# Conversation Memory\n\n## Goal\n\n${title}\n`,
    );

    const conv = this.conversations.upsert({ id, projectId, title, relativePath: relPath });
    await this.persistDb();
    return conv;
  }

  async appendMessage(
    conversationId: string,
    role: ConversationMessage["role"],
    content: string,
  ): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error("Conversation not found");

    const jsonRaw = await this.fs.readFile(`${conv.relativePath}/conversation.json`);
    const data = parseConversation(jsonRaw);

    const updated = appendMessageToConversation(ulid(), { role, content, createdAt: new Date().toISOString() }, data);

    await this.fs.writeFile(
      `${conv.relativePath}/conversation.json`,
      serializeConversation(updated),
    );

    // Update SQLite index
    this.messages.replaceAll(conversationId, updated.messages);
    this.conversations.updateCounts(
      conversationId,
      updated.userMessageCount,
      updated.assistantMessageCount,
    );
    await this.persistDb();
  }

  async getConversation(id: string): Promise<{
    conversation: Conversation;
    data: ConversationData;
    memory: string;
  }> {
    const conv = this.conversations.get(id);
    if (!conv) throw new Error("Conversation not found");
    const jsonRaw = await this.fs.readFile(`${conv.relativePath}/conversation.json`);
    const data = parseConversation(jsonRaw);
    const memory = await this.fs.readFile(`${conv.relativePath}/memory.md`).catch(() => "");
    return { conversation: conv, data, memory };
  }

  async updateConversationMemory(id: string, content: string): Promise<void> {
    const conv = this.conversations.get(id);
    if (!conv) throw new Error("Conversation not found");
    await this.fs.writeFile(`${conv.relativePath}/memory.md`, content);
  }

  async deleteConversation(id: string): Promise<void> {
    const conv = this.conversations.get(id);
    if (!conv) return;
    await this.fs.deleteDir(conv.relativePath);
    this.conversations.remove(id);
    await this.persistDb();
  }

  listConversations(projectId: string): Conversation[] {
    return this.conversations.listByProject(projectId);
  }

  // ── Memory (unchanged) ───────────────────────────────────────────

  async getUserMemory(): Promise<string> {
    return this.fs.readFile("user.md").catch(() => "");
  }

  async updateUserMemory(content: string): Promise<void> {
    await this.fs.writeFile("user.md", content);
  }

  async getProjectMemory(projectId: string): Promise<string> {
    const p = this.projects.list().find((x) => x.id === projectId);
    if (!p) throw new Error("Project not found");
    return this.fs.readFile(`${p.relativePath}/memory.md`).catch(() => "");
  }

  async updateProjectMemory(projectId: string, content: string): Promise<void> {
    const p = this.projects.list().find((x) => x.id === projectId);
    if (!p) throw new Error("Project not found");
    await this.fs.writeFile(`${p.relativePath}/memory.md`, content);
  }

  // ── Daily (unchanged) ────────────────────────────────────────────

  async getDailyNote(date: Date): Promise<string> {
    const { dailyFileName, dailyHeader } = await import("@/lib/memory/markdown");
    const path = `daily/${dailyFileName(date)}`;
    if (await this.fs.exists(path)) return this.fs.readFile(path);
    return dailyHeader(date);
  }

  async appendDailyActivity(date: Date, activity: string): Promise<void> {
    const { dailyFileName, appendActivity } = await import("@/lib/memory/markdown");
    const path = `daily/${dailyFileName(date)}`;
    const existing = await this.getDailyNote(date);
    await this.fs.writeFile(path, appendActivity(existing, activity));
  }

  // ── Tags (unchanged) ──────────────────────────────────s───────────

  listTags() {
    return this.tags.list();
  }

  setConversationTags(conversationId: string, names: string[]) {
    this.tags.setForConversation(conversationId, names);
  }

  getConversationTags(conversationId: string) {
    return this.tags.getForConversation(conversationId);
  }
}

export const workspaceService = new WorkspaceService();
