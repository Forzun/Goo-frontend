
export interface Project { 
    id: string;
    name: string;
    relativePath: string; 
    createdAt: string; 
    updatedAt: string
}

export interface ConversationMetadata { 
    id: string; 
    title: string;
    createdAt:string;
    updatedAt: string; 
    messageCount: number; 
    userMessageCount: number; 
    assistantMessageCount: number; 
}

export interface Conversation {
    id: string; 
    title: string;
    projectId: string;
    relativePath: string; 
    messages: ConversationMessage[]; 
    metaData: ConversationMetadata
}

export interface ConversationMessage {
    id: string;
    role: "user" | "assistant" | "system"; 
    content: string;
    createdAt: string
}

export interface ConversationData {
  id: string
  title: string
  projectId: string
  createdAt: string
  updatedAt: string
  messageCount: number
  userMessageCount: number
  assistantMessageCount: number
  messages: ConversationMessage[]
} 

export interface Tag { 
    id: string; 
    name: string; 
    createdAt: string
}


export interface DailyNote { 
    date: string; 
    content: string; 
} 


export interface FileIndexEntry { 
    id: string;
    relativePath: string
    type: string; 
    size: number
    modifiedAt: string; 
}



