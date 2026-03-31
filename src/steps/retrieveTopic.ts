import { EMBEDDING_MODEL, EMBEDDING_DIMENSION, TOPIC_TOPK, TOPIC_DISTANCE_THRESHOLD } from '../config'
import { embedTexts } from '../modules/embedding'
import { queryChatTopics } from '../modules/pg'
import type { ChatTopicRecord, TaskContext } from '../type'

export const retrieveTopicStep = async <T extends 'chat'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
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

    // retrieve long-term memory from database
    let topicRecords: ChatTopicRecord[] = []
    try {
        topicRecords = await queryChatTopics(embeddings[0], TOPIC_TOPK, TOPIC_DISTANCE_THRESHOLD, { userId, soulId })
    } catch (e) {
        console.error('Failed to retrieve topics from database: ', e)
        throw 'FAILED_RETRIEVE_TOPICS'
    }

    // console.log(3333, topicRecords)

    context.meta.contentEmbedding = embeddings[0]
    context.meta.retrievedTopics = topicRecords.map(topic => topic.summary)
    return context
}
