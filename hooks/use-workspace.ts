import { workspaceService } from "@/features/workspace/workspace-service";
import { ConversationData, Project } from "@/types/workspace";
import { useCallback, useEffect, useState } from "react";

interface WorkspaceStatus {
  status: "laoding" | "no-workspace" | "ready",
  projects: Project[],
  activeProjectId: string | null,
  conversations: ConversationData[],
}

export function useWorkspace() {
  const [status, setStatus] = useState<WorkspaceStatus>({
    status: "laoding",
    projects: [],
    activeProjectId: null,
    conversations: []
  })

  const refresh = useCallback(() => {

  }, [])

  useEffect(() => {
    workspaceService.open().then((result) => {
      if (result === "restored") {
        refresh();
      } else {
        setStatus((s) => {
          return {
            ...s,
            status: "no-workspace"
          }
        })
      }
    })
  },[])


  return
}
