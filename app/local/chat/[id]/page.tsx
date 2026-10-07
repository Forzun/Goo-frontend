"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { use, useState } from "react";

export default function Page({
  params,
}:{
    params: Promise<{ id: string }>,
}) {
  const ws = useWorkspace();
  const {id} = use(params)

  console.log(id)

  const [workspaceName, setWorkspaceName] = useState("Untitled");
  const [error, setError] = useState<string | null>(null)

  const fsApiAvailable = typeof window !== "undefined" && "showDirectoryPicker" in window

  const handleSelect = async () => {
    setError(null);
    if (!fsApiAvailable) {
      setError(
        "File System Access API is blocked. In Brave: click the lion icon → Shields DOWN → refresh. Or use Chrome/Edge."
      );
      return;
    }
    try {
      await ws.selectWorkspace(workspaceName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open workspace");
    }
  }

  if (ws.status === "loading") {
    return <div className="flex h-screen items-center justify-center">Loading… </div>;
  }

  if (ws.status === "no-workspace") {
    return (
      <div >

      </div>
    );
  }
}
