import { ConversationData, ConversationMessage } from "@/types/workspace";

export function serializeConversation(data: ConversationData): string {
    return JSON.stringify(data , null , 2)
}


export function parseConversation(json: string): ConversationData {
    const parsed = JSON.parse(json) as ConversationData

    return {
        id: parsed.id ?? "",
        title: parsed.title ?? "Untittled",
        projectId: parsed.projectId ?? "",
        createdAt: parsed.createdAt ?? new Date().toISOString(),
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        messageCount: parsed.messageCount ?? 0,
        userMessageCount: parsed.userMessageCount ?? 0,
        assistantMessageCount: parsed.assistantMessageCount ?? 0,
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    }
}

export function createEmptyConversation(id: string , projectId:string, title: string): ConversationData{

    return {
        id: id,
        title: title,
        projectId: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        userMessageCount: 0,
        assistantMessageCount: 0,
        messages: [],
    }
}

export function appendMessageToConversation(id: string, message: Omit<ConversationMessage , "id">, data: ConversationData): ConversationData {

  const msg: ConversationMessage = {...message, id}
  const messages = [...data.messages, msg];
  const userCount = messages.map((m) => m.role === "user").length
  const assistandCount = messages.map((m) => m.role === "assistant").length

  return {
    ...data,
    messages: messages,
    userMessageCount: userCount,
    assistantMessageCount: assistandCount,
    updatedAt: new Date().toISOString(),
    messageCount: messages.length
   }

}
