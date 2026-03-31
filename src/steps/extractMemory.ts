import fs from 'node:fs/promises'
import type { ChatCompletionMessageParam } from 'openai/resources'
import { EXTRACTION_MODEL } from '../config'
import { extractContent } from '../modules/extraction'
import type { ChatHistoryRecord, TaskContext } from '../type'

export const extractMemoryStep = async <T extends 'chat' | 'memory'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const historyRecords = context.meta.historyRecords as ChatHistoryRecord[] | undefined
    if (!historyRecords || historyRecords.length === 0) throw 'MISSING_REQUIRED_PARAMETER'

    // load system prompt template
    let systemPrompt = ''
    try {
        systemPrompt = await fs.readFile('prompts/common/ltm.txt', 'utf-8')
    } catch (e) {
        console.error('Failed to read system prompt', e)
        throw 'FAILED_READ_SYSTEM_PROMPT'
    }

    // group history messages by user id
    const userHistoryMessages: Record<string, ChatCompletionMessageParam[]> = {}
    for (const record of historyRecords) {
        if (!userHistoryMessages[record.userId]) {
            userHistoryMessages[record.userId] = []
        }
        userHistoryMessages[record.userId].push({ role: record.role, content: record.content })
    }

    // extract long-term memory from each user's conversation
    const extractedMemories: Array<{ userId: string, soulId: string, memory: string }> = []
    for (const [userId, historyMessages] of Object.entries(userHistoryMessages)) {
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: 'Extract all long-term memories from the conversation above. Respond ONLY in JSON: {"memories": []}' },
        ]

        let result: { memories: string[] }
        try {
            const rawResult = await extractContent(messages, EXTRACTION_MODEL)
            result = JSON.parse(rawResult)
        } catch (e) {
            console.error(`Failed to extract long-term memory for user ${userId}: `, e)
            continue
        }
        if (!result.memories || !Array.isArray(result.memories)) {
            console.error(`Failed to extract long-term memories for user ${userId}:`, JSON.stringify(result))
            continue
        }
        
        extractedMemories.push(...result.memories.map(memory => ({ userId, soulId: historyRecords[0].soulId, memory })))
    }

    if (Object.keys(extractedMemories).length === 0) throw 'FAILED_EXTRACT_MEMORIES'
    
    context.meta.extractedMemories = extractedMemories
    return context
}
