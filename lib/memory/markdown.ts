import type { ConversationMessage, DailyNote } from "@/types/workspace";

// ── conversation.md ──────────────────────────────────────────────────

export function serializeConversation(messages: ConversationMessage[]): string {
  const lines: string[] = [`# Conversation\n`];
  for (const m of messages) {
    const who = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
    lines.push(`## ${who} — ${m.createdAt}\n`);
    lines.push(m.content.trim());
    lines.push("");
  }
  return lines.join("\n");
}

export function parseConversation(md: string): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  // Split on "## User —" / "## Assistant —" headers
  const re = /^## (User|Assistant|System) — (\S+)\s*$/gm;
  const matches = [...md.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : md.length;
    messages.push({
      id: `${matches[i][2]}-${i}`,
      role: matches[i][1].toLowerCase() as ConversationMessage["role"],
      createdAt: matches[i][2],
      content: md.slice(start, end).trim(),
    });
  }
  return messages;
}

// ── memory.md templates ──────────────────────────────────────────────

export const CONVERSATION_MEMORY_TEMPLATE = `# Conversation Memory

## Goal

## Decisions

## Current Status

## Open Questions
`;

export const PROJECT_MEMORY_TEMPLATE = `# Project Memory

## Goal

## Architecture

## Technology Choices

## Important Decisions

## Current State

## Constraints

## Unresolved Questions
`;

export const USER_MEMORY_TEMPLATE = `# User Memory

## Preferences

## Technical Context
`;

// ── metadata.json ────────────────────────────────────────────────────

export function serializeMetadata(m: {
  id: string; title: string; createdAt: string; updatedAt: string;
  messageCount: number; userMessageCount: number; assistantMessageCount: number;
}): string {
  return JSON.stringify(m, null, 2);
}

// ── daily ────────────────────────────────────────────────────────────

export function dailyFileName(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}.md` // 2026-09-23.md
}

export function dailyHeader(date: Date): string {
  return `# ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\n## Activity\n`;
}

export function appendActivity(existing: string, activity: DailyNote): string {
  const label = activity.content?.trim() || "User message";
  return existing.trimEnd() + `\n- ${activity.date} · ${label}\n`;
}

export function countDailyActivity(markdown: string): number {
  const activitySection = markdown.split(/^## Activity\s*$/m)[1];
  if (!activitySection) return 0;
  return activitySection
    .split("\n")
    .filter((line) => /^\s*-\s+/.test(line)).length;
}
