import fs from 'node:fs/promises'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { EXTRACTION_MODEL } from '../config'
import { extractContent } from '../modules/extraction'
import type { ChatHistoryRecord, ChatTopicRecord, TaskContext } from '../type'

export const summarizeTopicStep = async <T extends 'topic'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const historyRecords = context.meta.historyRecords as ChatHistoryRecord[] | undefined
    if (!historyRecords || historyRecords.length === 0) throw 'MISSING_REQUIRED_PARAMETER'

    // load system prompt template
    let systemPrompt = ''
    try {
        systemPrompt = await fs.readFile('prompts/topic/topic.txt', 'utf-8')
    } catch (e) {
        console.error('Failed to read system prompt', e)
        throw 'FAILED_READ_SYSTEM_PROMPT'
    }

    // get participants from history records
    const participants = Array.from(new Set(historyRecords.map(record => record.userId)))

    const historyMessages = historyRecords.map(record => ({
        role: record.role,
        content: participants.length > 1 && record.role === 'user'
            ? `[${record.userId}] ${record.content}`
            : record.content,
    }))

    const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: 'Summarize the topics from the conversation above. Respond ONLY in JSON: {"topics": []}' },
    ]

    // summarize topics from conversation
    let result: { topics: string[] }
    try {
        const rawResult = await extractContent(messages, EXTRACTION_MODEL)
        result = JSON.parse(rawResult)
    } catch (e) {
        console.error('Failed to summarize topics', e)
        throw 'FAILED_SUMMARIZE_TOPICS'
    }
    if (!result.topics || !Array.isArray(result.topics)) {
        console.error('Failed to summarize topics:', JSON.stringify(result))
        throw 'FAILED_SUMMARIZE_TOPICS'
    }

    const summarizedTopics: Omit<ChatTopicRecord, 'id' | 'embedding'>[] = result.topics.map((topic, i) => ({
        summary: topic,
        participants,
        soulId: historyRecords[0].soulId,
        conversationId: historyRecords[0].conversationId,
        startedAt: historyRecords[0].createdAt,
        endedAt: historyRecords[historyRecords.length - 1].createdAt,
        metadata: {},
    }))

    context.meta.summarizedTopics = summarizedTopics
    return context
}
