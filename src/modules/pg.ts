/**
 * PostgreSQL module
 */
import { Pool } from 'pg'
import type { QueryResult } from 'pg'
import pgvector from 'pgvector'
import type { ChatHistoryRecord, ChatTopicRecord, PgCredential, RetrievalResult, VectorRecord } from '../type'

type VectorTableName = 'user_memories' | 'knowledge'

/**
 * PostgreSQL client instance
 */
export let pgClient: Pool

/**
 * Initialize PostgreSQL client
 * @param config PostgreSQL configuration
 */
export const initPgClient = async (config: PgCredential) => {
	const { PG_HOST, PG_PORT, PG_USERNAME, PG_PASSWORD, PG_DATABASE } = config
	if (!PG_HOST || !PG_PORT || !PG_USERNAME || !PG_PASSWORD || !PG_DATABASE) throw 'INVALID_POSTGRES_CREDENTIALS'

	pgClient = new Pool({
		host: PG_HOST,
		port: PG_PORT,
		user: PG_USERNAME,
		password: PG_PASSWORD,
		database: PG_DATABASE,
	})

    try {
        const client = await pgClient.connect()
        client.release()
    } catch (e) {
        console.error('Failed connect PostgreSQL', e)
        throw 'FAILED_CONNECT_PG_CLIENT'
    }
}

/**
 * Disconnect PostgreSQL client
 * @returns 1 on success, 0 if not initialized
 */
export const disconnectPgClient = async (): Promise<number> => {
	if (!pgClient) return 0
	try {
		await pgClient.end()
	} catch (e) {
		console.error('Failed disconnect PostgreSQL client', e)
		throw 'FAILED_DISCONNECT_PG_CLIENT'
	}
	return 1
}

/**
 * Query chat history records from chat_histories table
 * @param filters query filters
 * @param limit number of records to query
 * @returns chat history records
 */
export const queryChatHistories = async (filters: {
	userId?: string,
	soulId?: string,
	conversationId?: string,
}, limit: number): Promise<ChatHistoryRecord[]> => {
	const { userId, soulId, conversationId } = filters
	if (!pgClient) throw 'PG_CLIENT_NOT_INITIALIZED'
	if (!userId && !soulId && !conversationId) throw 'INVALID_PARAMETER'

	const conditions: string[] = []
	const values: any[] = []
	if (userId) {
		values.push(userId)
		conditions.push(`user_id = $${values.length}`)
	}
	if (soulId) {
		values.push(soulId)
		conditions.push(`soul_id = $${values.length}`)
	}
	if (conversationId) {
		values.push(conversationId)
		conditions.push(`conversation_id = $${values.length}`)
	}
	values.push(limit)

	const whereClause = conditions.length ? `${conditions.join(' AND ')}` : 'TRUE'

	const sql = `
		SELECT
			id,
			role,
			content,
			user_id AS "userId",
			soul_id AS "soulId",
			conversation_id AS "conversationId",
			metadata AS "metadata",
			created_at AS "createdAt"
		FROM (
			SELECT *
			FROM chat_histories
			WHERE ${whereClause}
			ORDER BY created_at DESC
			LIMIT $${values.length}
		) t
		ORDER BY created_at ASC
	`

	let res: QueryResult<ChatHistoryRecord>
	try {
		res = await pgClient.query(sql, values)
	} catch (e) {
		console.error('Failed query chat histories from PostgreSQL', e)
		throw 'FAILED_QUERY_CHAT_HISTORIES'
	}

	return res.rows
}

/**
 * Insert chat history records to chat_histories table
 * @param records history records to insert
 * @returns array of record ids inserted
 */
export const insertChatHistories = async (records: Omit<ChatHistoryRecord, 'createdAt'>[]): Promise<string[]> => {
	if (!pgClient) throw 'PG_CLIENT_NOT_INITIALIZED'
	if (records.length === 0) return []

	let index = 1
	const placeholders: string[] = []
	const values: any[] = []
	for (const record of records) {
		placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}::jsonb)`)
		values.push(
			record.id,
			record.role,
			record.content,
			record.userId,
			record.soulId,
			record.conversationId,
			record.metadata,
		)
	}

	const sql = `
		INSERT INTO chat_histories
		(id, role, content, user_id, soul_id, conversation_id, metadata)
		VALUES
		${placeholders.join(', ')}
	`

	try {
		await pgClient.query(sql, values)
	} catch (e) {
		console.error('Failed insert chat histories to PostgreSQL', e)
		throw 'FAILED_INSERT_CHAT_HISTORIES'
	}

	return records.map(record => record.id)
}

/**
 * Query chat topics records from chat_topics table
 * @param vector query vector
 * @param topK number of results to retrieve
 * @param distThreshold distance threshold to consider a result as a match, 0 means no filter
 * @param filters query filters
 * @returns chat topics records
 */
export const queryChatTopics = async (
	vector: number[],
	topK: number = 5,
	distThreshold: number = 0,
	filters?: {
		userId?: string,
		soulId?: string,
	},
): Promise<ChatTopicRecord[]> => {
	const { userId, soulId } = filters ?? {}
	if (!pgClient) throw 'PG_CLIENT_NOT_INITIALIZED'
	if (vector.length === 0) return []

	const conditions: string[] = []
	const values: any[] = [
		pgvector.toSql(vector),
		distThreshold || null,
		topK,
	]
	if (userId) {
		values.push(userId)
		conditions.push(`$${values.length} = ANY(participants)`)
	}
	if (soulId) {
		values.push(soulId)
		conditions.push(`soul_id = $${values.length}`)
	}
	const whereClause = conditions.length ? `${conditions.join(' AND ')}` : 'TRUE'

	const sql = `
		SELECT *
		FROM (
			SELECT
				id,
				summary,
				embedding,
				participants,
				soul_id AS "soulId",
				conversation_id AS "conversationId",
				started_at AS "startedAt",
				ended_at AS "endedAt",
				metadata AS "metadata",
				embedding <=> $1 AS distance
			FROM chat_topics
			WHERE ${whereClause}
		) t
		WHERE ($2::float8 IS NULL OR t.distance <= $2)
		ORDER BY t.distance
		LIMIT $3
	`

	let res: QueryResult<ChatTopicRecord>
	try {
		res = await pgClient.query(sql, values)
	} catch (e) {
		console.error('Failed query chat topics from PostgreSQL', e)
		throw 'FAILED_QUERY_CHAT_TOPICS'
	}

	return res.rows
}

/**
 * Insert chat topic records to chat_topics table
 * @param records topic records to insert
 * @returns array of record ids inserted
 */
export const insertChatTopics = async (records: ChatTopicRecord[]): Promise<string[]> => {
	if (!pgClient) throw 'PG_CLIENT_NOT_INITIALIZED'
	if (records.length === 0) return []

	let index = 1
	const placeholders: string[] = []
	const values: any[] = []
	for (const record of records) {
		placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}::jsonb)`)
		values.push(
			record.id,
			record.summary,
			pgvector.toSql(record.embedding),
			record.participants,
			record.soulId,
			record.conversationId,
			record.startedAt,
			record.endedAt,
			record.metadata,
		)
	}

	const sql = `
		INSERT INTO chat_topics
		(id, summary, embedding, participants, soul_id, conversation_id, started_at, ended_at, metadata)
		VALUES
		${placeholders.join(', ')}
	`

	try {
		await pgClient.query(sql, values)
	} catch (e) {
		console.error('Failed insert chat topics to PostgreSQL', e)
		throw 'FAILED_INSERT_CHAT_TOPICS'
	}

	return records.map(record => record.id)
}

/**
 * Retrieve vector records from PostgreSQL table by vector similarity
 * @param tableName table name
 * @param vectors array of vectors to query
 * @param topK number of results to retrieve
 * @param distThreshold distance threshold to consider a result as a match, 0 means no filter
 * @param metadataFilters optional metadata filters
 * @returns for each input vector, an array of matching records ordered by distance
 */
export const retrieveVectorRecords = async (
	tableName: VectorTableName,
	vectors: number[][],
	topK: number = 5,
	distThreshold: number = 0,
	metadataFilters?: Record<string, any>
): Promise<RetrievalResult[][]> => {
	if (!pgClient) throw 'PG_CLIENT_NOT_INITIALIZED'
	if (vectors.length === 0) return []

	const metadataEntries = Object.entries(metadataFilters ?? {})
	const whereClause = metadataEntries.length
		? metadataEntries.map((_, i) => `metadata ->> $${vectors.length + 3 + i * 2} = $${vectors.length + 4 + i * 2}`).join(' AND ')
		: 'TRUE'
	const metadataValues = metadataEntries.flatMap(([k, v]) => [k, String(v)])
	
	const sql = `
		WITH query_vectors AS (
			SELECT query_vec, vector_idx
			FROM (VALUES ${vectors.map((_, i) => `($${i + 1}::vector, ${i})`).join(', ')})
			AS t(query_vec, vector_idx)
		)
		SELECT 
			qv.vector_idx,
			t.id,
			t.document,
			t.metadata,
			t.distance
		FROM query_vectors qv
		CROSS JOIN LATERAL (
			SELECT *
			FROM (
				SELECT
					id,
					document,
					metadata,
					embedding <=> qv.query_vec AS distance
				FROM ${tableName}
				WHERE ${whereClause}
			) s
			WHERE ($${vectors.length + 1}::float8 IS NULL OR distance <= $${vectors.length + 1})
			ORDER BY distance
			LIMIT $${vectors.length + 2}
		) t
		ORDER BY qv.vector_idx, t.distance
	`

	const values = [
		...vectors.map(v => pgvector.toSql(v)),
		distThreshold || null,
		topK,
		...metadataValues,
	]

	let res: QueryResult<RetrievalResult & { vector_idx: number }>
    try {
		res = await pgClient.query(sql, values)
    } catch (e) {
        console.error('Failed retrieve vector records from PostgreSQL', e)
        throw 'FAILED_RETRIEVE_VECTOR_RECORDS'
    }

    const records = Array.from({ length: vectors.length }, (_, i) =>
		res.rows
			.filter(row => row.vector_idx === i)
			.map(({ vector_idx, ...record }) => record)
	)

	return records
}

/**
 * Upsert vector records to PostgreSQL table
 * @param tableName table name
 * @param records records to upsert
 * @returns array of record ids upserted
 */
export const upsertVectorRecords = async (tableName: VectorTableName, records: VectorRecord[]): Promise<string[]> => {
	if (!pgClient) throw 'PG_CLIENT_NOT_INITIALIZED'
	if (records.length === 0) return []

	// deduplicate records by id
	const dedupedRecords = Array.from(new Map(records.map(record => {
		if (!record.id) throw 'INVALID_RECORD_ID'
		return [record.id, record]
	})).values())

	let index = 1
	const placeholders: string[] = []
	const values: any[] = []
	for (const record of dedupedRecords) {
		placeholders.push(`($${index++}::text, $${index++}::text, $${index++}::vector, $${index++}::jsonb)`)
		values.push(
			record.id,
			record.document,
			pgvector.toSql(record.embedding),
			record.metadata ?? {},
		)
	}

	const sql = `
		INSERT INTO ${tableName} (id, document, embedding, metadata) VALUES
		${placeholders.join(', ')}
		ON CONFLICT (id) DO UPDATE SET
			document = EXCLUDED.document,
			embedding = EXCLUDED.embedding,
			metadata = EXCLUDED.metadata
	`

	try {
		await pgClient.query(sql, values)
	} catch (e) {
		console.error('Failed upsert vector records to PostgreSQL', e)
		throw 'FAILED_UPSERT_VECTOR_RECORDS'
	}

	return dedupedRecords.map(record => record.id)
}
