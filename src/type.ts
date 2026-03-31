/**
 * Module Credentials
 */
export interface RedisCredential {
    REDIS_HOST: string
    REDIS_PORT: number
    REDIS_ACCOUNT?: string
    REDIS_PASSWORD: string
    onReady?: (...args: any[]) => void
    onError?: (...args: any[]) => void
    onReconnecting?: (...args: any[]) => void
}

export interface PgCredential {
    PG_HOST: string
    PG_PORT: number
    PG_USERNAME: string
    PG_PASSWORD: string
    PG_DATABASE: string
}

export interface ChromaCredential {
    CHROMA_HOST: string
    CHROMA_PORT: number
    CHROMA_TENANT: string
    CHROMA_DATABASE: string
}

/**
 * Custom Data Types
 */
export interface ChatHistoryRecord {
    id: string
    role: 'user' | 'assistant'
    content: string
    userId: string
    soulId: string
    conversationId: string
    metadata: Record<string, any>
    createdAt: Date
}

export interface ChatTopicRecord {
    id: string
    summary: string
    embedding: number[]
    participants: string[]
    soulId: string
    conversationId: string
    startedAt: Date
    endedAt: Date
    metadata: Record<string, any>
}

export interface VectorRecord {
    id: string
    document: string
    embedding: number[]
    metadata: Record<string, any>
}

export interface RetrievalResult {
    id: string
    document: string
    metadata: Record<string, any>
    distance: number
}

export interface MCPToolCallResult {
    name: string
    iteration: number
    status: 'success' | 'failed'
    error?: string
}

/**
 * Chat Workflow Configuration
 */
export interface ChatInput {
    userId: string
    soulId: string
    conversationId: string
    content: string
    platform: number
    config?: {
        ragEnabled?: number
        ltmEnabled?: number
        topicEnabled?: number
        mcpEnabled?: number
        [key: string]: unknown
    }
}

export interface ChatOutput {
    conversationId: string
    reply: string
}

/**
 * Ingest Knowledge Workflow Configuration
 */
export interface IngestKnowledgeInput {
    files: Array<{ name: string, path: string, source: 'local' | 'remote' }>
    soulId?: string
}

export interface IngestKnowledgeOutput {
    knowledgeIds: string[]
}

/**
 * Extract Memory Workflow Configuration
 */
export interface ExtractMemoryInput {
    conversationId: string
}

export interface ExtractMemoryOutput {
    memoryIds: string[]
}

/**
 * Summarize Topic Workflow Configuration
 */
export interface SummarizeTopicInput {
    conversationId: string
}

export interface SummarizeTopicOutput {
    topicIds: string[]
}

/**
 * Redis Message List Task
 */
export type MsgListTask = {
    traceId?: string
    parentSpanId?: string
    botId?: string
    soulId?: string
    data: WorkflowIOMap[WorkflowType]['input']
}

/**
 * Workflow, Step Types and Context
 */
export interface WorkflowIOMap {
    chat: { input: ChatInput, output: ChatOutput }
    knowledge: { input: IngestKnowledgeInput, output: IngestKnowledgeOutput }
    memory: { input: ExtractMemoryInput, output: ExtractMemoryOutput }
    topic: { input: SummarizeTopicInput, output: SummarizeTopicOutput }
}

export type WorkflowType = keyof WorkflowIOMap

export interface TaskContext<T extends WorkflowType> {
    taskId: string
    workflow: T
    input: WorkflowIOMap[T]['input']
    output: WorkflowIOMap[T]['output']
    steps: Record<string, { status: 'success' | 'failed' | 'skipped', error?: string }>
    meta: Record<string, unknown>
}

export interface StepConfig<T extends WorkflowType> {
    name: string
    run: (context: TaskContext<T>) => Promise<TaskContext<T>>
    enabled: boolean
    waitForCompletion: boolean
    onError: 'abort' | 'continue'
}
