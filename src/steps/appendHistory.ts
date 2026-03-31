import { randomUUID } from 'crypto'
import { insertChatHistories } from '../modules/pg'
import type { ChatHistoryRecord, TaskContext } from '../type'

export const appendHistoryStep = async <T extends 'chat'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const { userId, soulId, conversationId, content } = context.input
    if (!userId || !soulId || !conversationId || !content || !context.meta.reply) throw 'MISSING_REQUIRED_PARAMETER'

    const records: Omit<ChatHistoryRecord, 'createdAt'>[] = [
        { id: randomUUID(), role: 'user', content, userId, soulId, conversationId, metadata: {} },
        { id: randomUUID(), role: 'assistant', content: context.meta.reply as string, userId, soulId, conversationId, metadata: {} },
    ]

    // insert chat history records to database
    try {
        await insertChatHistories(records)
    } catch (e) {
        console.error('Failed to insert chat history records to database', e)
        throw 'FAILED_INSERT_CHAT_HISTORIES'
    }

    return context
}
