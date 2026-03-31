import { EMBEDDING_MODEL, EMBEDDING_DIMENSION, VECTOR_STORE, RAG_TOPK, RAG_DISTANCE_THRESHOLD } from '../config'
import { embedTexts } from '../modules/embedding'
import { retrieveVectorRecords as retrieveFromChroma } from '../modules/chroma'
import { retrieveVectorRecords as retrieveFromPg } from '../modules/pg'
import type { RetrievalResult, TaskContext } from '../type'

export const retrieveKnowledgeStep = async <T extends 'chat'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const { content } = context.input
    if (!content) throw 'MISSING_REQUIRED_PARAMETER'

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

    // retrieve knowledge
    let ragRecords: RetrievalResult[][] = []
    try {
        ragRecords = VECTOR_STORE === 'chroma'
            ? await retrieveFromChroma('knowledge', embeddings, RAG_TOPK, RAG_DISTANCE_THRESHOLD)
            : await retrieveFromPg('knowledge', embeddings, RAG_TOPK, RAG_DISTANCE_THRESHOLD)
    } catch (e) {
        console.error('Failed to retrieve knowledge: ', e)
        throw 'FAILED_RETRIEVE_KNOWLEDGE'
    }

    context.meta.contentEmbedding = embeddings[0]
    context.meta.retrievedKnowledge = ragRecords[0].map(d => d.document)
    return context
}
