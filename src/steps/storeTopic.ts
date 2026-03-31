import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '../config'
import { embedTexts } from '../modules/embedding'
import { insertChatTopics } from '../modules/pg'
import { hash } from '../util'
import type { ChatTopicRecord, TaskContext } from '../type'

export const storeTopicStep = async <T extends 'topic'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const summarizedTopics = context.meta.summarizedTopics as Omit<ChatTopicRecord, 'id' | 'embedding'>[] | undefined
    if (!summarizedTopics) throw 'MISSING_REQUIRED_PARAMETER'
    if (summarizedTopics.length === 0) {
        console.warn('No summarized topics found')
        return context
    }

    // embed summarized topics
    let embeddings: number[][] = []
    try {
        embeddings = await embedTexts(summarizedTopics.map(topic => topic.summary), EMBEDDING_MODEL, EMBEDDING_DIMENSION)
    } catch (e) {
        console.error('Failed to embed topics: ', e)
        throw 'FAILED_EMBED_TOPICS'
    }

    // store topics to database
    let topicIds: string[] = []
    try {
        topicIds = await insertChatTopics(summarizedTopics.map((topic, i) => ({
            ...topic,
            id: hash(`${topic.conversationId}-${topic.summary}`),
            embedding: embeddings[i],
        })))
    } catch (e) {
        console.error('Failed to store topics to database: ', e)
        throw 'FAILED_STORE_TOPICS'
    }

    context.output.topicIds = topicIds
    return context
}
