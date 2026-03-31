import { VECTOR_STORE, EMBEDDING_MODEL, EMBEDDING_DIMENSION, LTM_MERGE_DISTANCE_THRESHOLD, } from '../config'
import { embedTexts } from '../modules/embedding'
import { retrieveVectorRecords as retrieveFromChroma, upsertVectorRecords as upsertToChroma } from '../modules/chroma'
import { retrieveVectorRecords as retrieveFromPg, upsertVectorRecords as upsertToPg } from '../modules/pg'
import { hash } from '../util'
import type { ExtractMemoryOutput, RetrievalResult, TaskContext } from '../type'

export const storeMemoryStep = async <T extends 'chat' | 'memory'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const extractedMemories = context.meta.extractedMemories as Array<{ userId: string, soulId: string, memory: string }> | undefined
    if (!extractedMemories) throw 'MISSING_REQUIRED_PARAMETER'
    if (extractedMemories.length === 0) {
        console.warn('No extracted memories found')
        return context
    }

    // embed long-term memory texts
    let embeddings: number[][] = []
    try {
        embeddings = await embedTexts(extractedMemories.map(m => m.memory), EMBEDDING_MODEL, EMBEDDING_DIMENSION)
    } catch (e) {
        console.error('Failed to embed long-term memory texts: ', e)
        throw 'FAILED_EMBED_MEMORIES'
    }

    // group embedded memories by user id
    const userEmbeddedMemories: Record<string, { userId: string, soulId: string, memory: string, embedding: number[] }[]> = {}
    extractedMemories.forEach((item, i) => {
        if (!userEmbeddedMemories[item.userId]) {
            userEmbeddedMemories[item.userId] = []
        }
        userEmbeddedMemories[item.userId].push({ ...item, embedding: embeddings[i] })
    })

    // retrieve matched long-term memories
    let matchedRecords: Array<RetrievalResult[][]> = []
    try {
        matchedRecords = await Promise.all(Object.entries(userEmbeddedMemories).map(([userId, items]) => {
            const embeddings = items.map(item => item.embedding)
            return VECTOR_STORE === 'chroma'
                ? retrieveFromChroma('user_memories', embeddings, 1, LTM_MERGE_DISTANCE_THRESHOLD, { $and: [{ user_id: userId }, { soul_id: items[0].soulId }] })
                : retrieveFromPg('user_memories', embeddings, 1, LTM_MERGE_DISTANCE_THRESHOLD, { user_id: userId, soul_id: items[0].soulId })
        }))
    } catch (e) {
        console.error('Failed to retrieve matched long-term memory: ', e)
        throw 'FAILED_RETRIEVE_MATCHED_MEMORIES'
    }

    const records = Object.entries(userEmbeddedMemories)
        .flatMap(([userId, items], userIdx) => items.map((item, i) => ({
            id: matchedRecords[userIdx]?.[i]?.[0]?.id ?? hash(`${userId}-${item.memory}`),
            document: item.memory,
            embedding: item.embedding,
            metadata: { user_id: userId, soul_id: item.soulId },
        })))

    // store long-term memories to vector store
    let memoryIds: string[] = []
    try {
        memoryIds = VECTOR_STORE === 'chroma'
            ? await upsertToChroma('user_memories', records)
            : await upsertToPg('user_memories', records)
    } catch (e) {
        console.error('Failed to store long-term memories to database: ', e)
        throw 'FAILED_STORE_MEMORIES'
    }

    if (context.workflow === 'memory') {
        ; (context.output as ExtractMemoryOutput).memoryIds = memoryIds
    }
    return context
}
