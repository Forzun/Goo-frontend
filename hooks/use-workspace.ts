import { workspaceService } from "@/features/workspace/workspace-service"
import { Conversation, Project } from "@/types/workspace"
import { useCallback, useEffect, useState } from "react"

interface WorkspaceStatus {
  status: "loading" | "no-workspace" | "ready"
  projects: Project[]
  activeProjectId: {
    projectId: string
  }[] | null,
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
    const conversations = projects.flatMap((p) =>
      workspaceService.listConversations(p.id)
    )

    setStatus({
      status: "ready",
      projects: projects,
      activeProjectId: null,
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
      const current = s.activeProjectId ?? []

      const next = current.some(x => x.projectId === id)
        ? current.filter(x => x.projectId !== id)
        : [...current , {projectId: id}]

      return {
        ...s,
        activeProjectId: next,
      }
    })
  }, [])

  const createConversation = useCallback(
    async (projectId: string, title: string) => {
      const conversation = await workspaceService.createConversation(projectId, title)
      setStatus((s) => {
        return {
          ...s,
          conversations: [...s.conversations, conversation],
        }
      })
      return conversation
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
