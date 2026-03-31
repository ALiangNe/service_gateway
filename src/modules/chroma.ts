/**
 * Chroma module
 */
import { ChromaClient } from 'chromadb'
import type { Collection, QueryResult } from 'chromadb'
import type { ChromaCredential, RetrievalResult, VectorRecord } from '../type'

type CollectionName = 'user_memories' | 'knowledge'

/**
 * Chroma client instance
 */
export let chromaClient: ChromaClient | null = null

/**
 * Initialize chroma client
 * @param config chroma configuration
 */
export const initChromaClient = (config: ChromaCredential) => {
	const { CHROMA_HOST, CHROMA_PORT, CHROMA_TENANT, CHROMA_DATABASE } = config

    if (!CHROMA_HOST || !CHROMA_PORT || !CHROMA_TENANT || !CHROMA_DATABASE) throw 'INVALID_CHROMA_CREDENTIALS'

	chromaClient = new ChromaClient({
		host: CHROMA_HOST,
		port: CHROMA_PORT,
		tenant: CHROMA_TENANT,
		database: CHROMA_DATABASE,
	})
}

/**
 * Disconnect chroma client
 * @returns 1 on success, 0 if not initialized
 */
export const disconnectChromaClient = (): number => {
    if (!chromaClient) return 0
    chromaClient = null
    return 1
}

/**
 * Retrieve vector records from chroma collection by vector similarity
 * @param collectionName collection name
 * @param vectors array of vectors to query
 * @param topK number of results to retrieve
 * @param distThreshold distance threshold to consider a result as a match, 0 means no filter
 * @param metadataFilter optional metadata filter
 * @returns for each input vector, an array of matching records ordered by distance
 */
export const retrieveVectorRecords = async (
    collectionName: CollectionName,
    vectors: number[][],
    topK: number = 5,
    distThreshold: number = 0,
    metadataFilter?: Record<string, any>,
): Promise<RetrievalResult[][]> => {
    if (!chromaClient) throw 'CHROMA_CLIENT_NOT_INITIALIZED'
    if (vectors.length === 0) return []

    let collection: Collection
    try {
        collection = await chromaClient.getCollection({ name: collectionName })
    } catch (e) {
        console.error('Failed get chroma collection', e)
        throw 'FAILED_GET_CHROMA_COLLECTION'
    }

    const queryParams: Record<string, any> = {
        queryEmbeddings: vectors,
        nResults: distThreshold ? topK * 3 : topK, // fetch more results to filter by distThreshold
        include: ['documents', 'metadatas', 'distances'],
        ...(metadataFilter ? { where: metadataFilter } : {}),
    }
    
    let res: QueryResult<Record<string, any>>
    try {
        res = await collection.query(queryParams)
    } catch (e) {
        console.error('Failed query vector records from chroma', e)
        throw 'FAILED_QUERY_VECTOR_RECORDS'
    }

    console.log(2222,distThreshold, res)

    const records = vectors.map((_, i) =>
        (res.ids[i] ?? [])
            .map((id, j) => ({
                id,
                document: res.documents[i][j]!,
                metadata: res.metadatas[i][j]!,
                distance: res.distances[i][j]!,
            }))
            .filter(record => distThreshold ? record.distance <= distThreshold : true)
            .slice(0, topK)
    )

    return records
}

/**
 * Upsert vector records into chroma collection
 * @param collectionName collection name
 * @param records array of records to upsert
 * @returns array of record ids upserted
 */
export const upsertVectorRecords = async (collectionName: CollectionName, records: VectorRecord[]): Promise<string[]> => {
    if (!chromaClient) throw 'CHROMA_CLIENT_NOT_INITIALIZED'
    if (records.length === 0) return []

    // deduplicate records by id
    const dedupedRecords = Array.from(new Map(records.map(record => {
        if (!record.id) throw 'INVALID_RECORD_ID'
        return [record.id, record]
    })).values())

    let collection: Collection
    try {
        collection = await chromaClient.getCollection({ name: collectionName })
    } catch (e) {
        console.error('Failed get chroma collection', e)
        throw 'FAILED_GET_CHROMA_COLLECTION'
    }

    const ids = []
    const documents = []
    const embeddings = []
    const metadatas = []
    for (const record of dedupedRecords) {
        ids.push(record.id)
        documents.push(record.document)
        embeddings.push(record.embedding)
        metadatas.push(record.metadata ?? {})
    }

    try {
        await collection.upsert({ ids, documents, embeddings, metadatas })
    } catch (e) {
        console.error('Failed upsert vector records to chroma', e)
        throw 'FAILED_UPSERT_VECTOR_RECORDS'
    }

    return dedupedRecords.map(record => record.id)
}
