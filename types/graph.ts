export type ConversationGraphNodeKind = "project" | "conversation"

export interface ConversationGraphNode {
  id: string
  name: string
  kind: ConversationGraphNodeKind
  val: number
  projectId?: string
  messageCount?: number
}

export interface ConversationGraphLink {
  source: string
  target: string
}

export interface ConversationGraphData {
  nodes: ConversationGraphNode[]
  links: ConversationGraphLink[]
}
