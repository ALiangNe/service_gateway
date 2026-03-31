/**
 * Embedding module
 */
import { OpenAI } from 'openai'
import type { CreateEmbeddingResponse } from 'openai/resources'

/**
 * Embedding client instance
 */
export let embeddingClient: OpenAI

/**
 * Initialize embedding client
 * @param config embedding configuration
 */
export const initEmbeddingClient = (apiKey: string, baseURL: string, timeout: number = 10000) => {
	if (!apiKey || !baseURL) throw 'INVALID_EMBEDDING_CREDENTIALS'

	embeddingClient = new OpenAI({ apiKey, baseURL, timeout })
}

/**
 * Embed multiple texts to vectors
 * @param texts input texts
 * @param model embedding model name
 * @param dimensions embedding vector size, default 1024
 * @param encodingFormat embedding encoding format, default 'float'
 * @returns array of embedding vectors
 */
export const embedTexts = async (texts: string[], model: string, dimensions = 1024, encodingFormat: 'float' | 'base64' = 'float', type: 'document' | 'query' = 'document'): Promise<number[][]> => {
	if (!embeddingClient) throw 'EMBEDDING_CLIENT_NOT_INITIALIZED'
	if (texts.length === 0) return []

	let resp: CreateEmbeddingResponse
	try {
		resp = await embeddingClient.embeddings.create({
			input: texts,
			model,
			dimensions,
			encoding_format: encodingFormat,
			extra_body: {
				parameter: {
					text_type: type
				}
			}
		} as any)
	} catch (e) {
		console.error('Failed call embedding model!', e)
		throw 'EMBEDDING_MODEL_CALL_FAILED'
	}

	return [...resp.data]
		.sort((a, b) => a.index - b.index)
		.map(item => item.embedding)
}
