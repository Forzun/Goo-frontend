"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { useState } from "react";

export default function Page() {
  const ws = useWorkspace();
  const [workspaceName, setWorkspaceName] = useState("My Workspace");

  if (ws.status === "loading") {
    return <div className="flex h-screen items-center justify-center">Loading…</div>;
  }

  if (ws.status === "no-workspace") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Welcome to LocalGoo</h1>
        <p className="text-muted-foreground">Select a local folder to use as your workspace.</p>
        <input
          className="rounded border px-3 py-2"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Workspace name"
        />
        <button
          className="rounded bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => ws.selectWorkspace(workspaceName)}
        >
          Choose Folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar p-4">
        <h2 className="mb-4 font-semibold">LocalGoo</h2>
        <button
          className="mb-2 w-full rounded border px-2 py-1 text-sm"
          onClick={() => {
            const name = prompt("Project name?");
            if (name) ws.createProject(name);
          }}
        >
          + New Project
        </button>
        {ws.projects.map((p) => (
          <div key={p.id}>
            <button
              className={`w-full rounded px-2 py-1 text-left text-sm ${ws.activeProjectId === p.id ? "bg-muted" : ""}`}
              onClick={() => ws.selectProject(p.id)}
            >
              {p.name}
            </button>
            {ws.activeProjectId === p.id && (
              <div className="ml-4 mt-1 space-y-1">
                {ws.conversations.map((c) => (
                  <div key={c.id} className="truncate text-xs text-muted-foreground">
                    {c.title}
                  </div>
                ))}
                <button
                  className="text-xs text-primary"
                  onClick={() => {
                    const t = prompt("Conversation title?");
                    if (t) ws.createConversation(p.id, t);
                  }}
                >
                  + New conversation
                </button>
              </div>
            )}
          </div>
        ))}
      </aside>

      {/* Main area */}
      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold">
          {ws.projects.find((p) => p.id === ws.activeProjectId)?.name ?? "Select a project"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select a conversation or create a new one.
        </p>
      </main>
    </div>
  );
}
