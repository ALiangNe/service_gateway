import fs from 'node:fs/promises'
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL, VECTOR_STORE } from '../config'
import { embedTexts } from '../modules/embedding'
import { upsertVectorRecords as upsertToChroma } from '../modules/chroma'
import { upsertVectorRecords as upsertToPg } from '../modules/pg'
import { hash, loadRemoteFile } from '../util'
import type { TaskContext, VectorRecord } from '../type'

export const ingestKnowledgeStep = async <T extends 'knowledge'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const { files, soulId } = context.input
    if (!files || files.length === 0) throw 'MISSING_REQUIRED_PARAMETER'

    // load documents from files
    const knowledgeResults = await Promise.allSettled(files.map(file => {
        switch (file.source) {
            case 'local':
                try {
                    return fs.readFile(file.path, 'utf-8')
                } catch (e) {
                    console.error('Failed to load local file: ', e)
                    throw 'FAILED_LOAD_LOCAL_FILE'
                }
            case 'remote':
                try {
                    return loadRemoteFile(file.path)
                } catch (e) {
                    console.error('Failed to load remote file: ', e)
                    throw 'FAILED_LOAD_REMOTE_FILE'
                }
            default:
                throw 'INVALID_INPUT_FILES'
        }
    }))

    const knowledgeDocs = knowledgeResults.filter(k => k.status === 'fulfilled').map(k => k.value)
    if (knowledgeDocs.length === 0) throw 'FAILED_LOAD_FILES'

    // embed knowledge texts
    let embeddings: number[][] = []
    try {
        embeddings = await embedTexts(knowledgeDocs, EMBEDDING_MODEL, EMBEDDING_DIMENSION)
    } catch (e) {
        console.error('Failed to embed knowledge texts: ', e)
        throw 'FAILED_EMBED_KNOWLEDGE_TEXTS'
    }

    const records: VectorRecord[] = embeddings.map((embedding, i) => ({
        id: hash(soulId ? `${soulId}-${knowledgeDocs[i]}` : knowledgeDocs[i]),
        document: knowledgeDocs[i],
        embedding,
        metadata: {
            file_name: files[i].name,
            ...(soulId ? { soul_id: soulId } : {}),
        },
    }))

    // store knowledge to vector store
    let knowledgeIds: string[] = []
    try {
        knowledgeIds = VECTOR_STORE === 'chroma'
            ? await upsertToChroma('knowledge', records)
            : await upsertToPg('knowledge', records)
    } catch (e) {
        console.error('Failed to store knowledge to database: ', e)
        throw 'FAILED_STORE_KNOWLEDGE'
    }

    context.output.knowledgeIds = knowledgeIds
    return context
}
