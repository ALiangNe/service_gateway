import { CHAT_HISTORY_MAX_LENGTH } from '../config'
import { queryChatHistories } from '../modules/pg'
import type { ChatHistoryRecord, ChatInput, ExtractMemoryInput, SummarizeTopicInput, TaskContext } from '../type'

export const loadHistoryStep = async <T extends 'chat' | 'memory' | 'topic'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    let filters: { soulId?: string, conversationId?: string } = {}
    if (context.workflow === 'chat') {
        const { soulId, conversationId } = context.input as ChatInput
        if (!soulId || !conversationId) throw 'MISSING_REQUIRED_PARAMETER'
        filters = { soulId, conversationId }
    } else {
        const { conversationId } = context.input as ExtractMemoryInput | SummarizeTopicInput
        if (!conversationId) throw 'MISSING_REQUIRED_PARAMETER'
        filters = { conversationId }
    }

    // load chat history records from database
    let historyRecords: ChatHistoryRecord[] = []
    try {
        historyRecords = await queryChatHistories(filters, CHAT_HISTORY_MAX_LENGTH)
    } catch (e) {
        console.error('Failed to load chat history records from database: ', e)
        throw 'FAILED_LOAD_HISTORY_MESSAGES'
    }

    context.meta.historyRecords = historyRecords
    return context
}
