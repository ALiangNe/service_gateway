import { EMBEDDING_MODEL, EMBEDDING_DIMENSION, VECTOR_STORE, LTM_TOPK, LTM_DISTANCE_THRESHOLD } from '../config'
import { embedTexts } from '../modules/embedding'
import { retrieveVectorRecords as retrieveFromChroma } from '../modules/chroma'
import { retrieveVectorRecords as retrieveFromPg } from '../modules/pg'
import type { RetrievalResult, TaskContext } from '../type'

export const retrieveMemoryStep = async <T extends 'chat'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const { userId, soulId, content } = context.input
    if (!userId || !soulId || !content) throw 'MISSING_REQUIRED_PARAMETER'

    // embed user's query if not cached
    let embeddings: number[][] = []
    try {
        embeddings = context.meta.contentEmbedding
            ? [context.meta.contentEmbedding as number[]]
            : await embedTexts([content], EMBEDDING_MODEL, EMBEDDING_DIMENSION)
    } catch (e) {
        console.error('Failed to embed content: ', e)
        throw 'FAILED_EMBED_CONTENT'
    }

    console.log(userId, soulId)

    // retrieve long-term memory
    let memoryRecords: RetrievalResult[][] = []
    try {
        memoryRecords = VECTOR_STORE === 'chroma'
            ? await retrieveFromChroma('user_memories', embeddings, LTM_TOPK, LTM_DISTANCE_THRESHOLD, { $and: [{ user_id: userId }, { soul_id: soulId }] })
            : await retrieveFromPg('user_memories', embeddings, LTM_TOPK, LTM_DISTANCE_THRESHOLD, { user_id: userId, soul_id: soulId })
    } catch (e) {
        console.error('Failed to retrieve long-term memory: ', e)
        throw 'FAILED_RETRIEVE_MEMORIES'
    }

    context.meta.contentEmbedding = embeddings[0]
    context.meta.userMemories = memoryRecords[0].map(d => d.document)
    return context
}
