import { workspaceService } from "@/features/workspace/workspace-service"
import { Conversation, Project } from "@/types/workspace"
import { useCallback, useEffect, useState } from "react"

interface WorkspaceStatus {
  status: "loading" | "no-workspace" | "ready"
  projects: Project[]
  activeProjectId: string | null
  conversations: Conversation[]
}

export function useWorkspace() {
  const [status, setStatus] = useState<WorkspaceStatus>({
    status: "loading",
    projects: [],
    activeProjectId: null,
    conversations: [],
  })

  const refresh = useCallback(() => {
    const projects = workspaceService.listProjects()
    const activeProjectId = projects[0]?.id ?? null
    const conversations = activeProjectId
      ? workspaceService.listConversations(activeProjectId)
      : []

    setStatus({
      status: "ready",
      projects: projects,
      activeProjectId: activeProjectId,
      conversations: conversations,
    })
  }, [])

  useEffect(() => {
    workspaceService
      .open()
      .then((result) => {
        if (result === "restored") {
          workspaceService.fs
            .readConfig()
            .then((config) => {
              if (!config) {
                setStatus((s) => {
                  return {
                    ...s,
                    status: "no-workspace",
                  }
                })
              } else {
                refresh()
              }
            })
            .catch(() => {
              setStatus((s) => {
                return {
                  ...s,
                  status: "no-workspace",
                }
              })
            })
        } else {
          setStatus((s) => {
            return {
              ...s,
              status: "no-workspace",
            }
          })
        }
      })
      .catch((error) => {
        // add toast here
        // console.error("Failed to open workspace:", error)
        setStatus((s) => {
          return {
            ...s,
            status: "no-workspace",
          }
        })
      })
  }, [])

  const selectWorkspace = useCallback(
    async (name: string) => {
      await workspaceService.selectAndInit(name)
      refresh()
    },
    [refresh]
  )

  const createProject = useCallback(
    async (name: string) => {
      await workspaceService.createProject(name)
      refresh()
    },
    [refresh]
  )

  const selectProject = useCallback(async (id: string) => {
    setStatus((s) => {
      return {
        ...s,
        activeProjectId: id,
        conversations: workspaceService.listConversations(id),
      }
    })
  }, [])

  const createConversation = useCallback(
    async (projectId: string, title: string) => {
      await workspaceService.createConversation(projectId, title)
      setStatus((s) => {
        return {
          ...s,
          conversations: workspaceService.listConversations(projectId),
        }
      })
    },
    []
  )

  return {
    ...status,
    refresh,
    selectProject,
    selectWorkspace,
    createProject,
    createConversation,
  }
}
