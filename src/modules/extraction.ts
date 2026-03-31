/**
 * Extraction Model module
 */
import { OpenAI } from 'openai'
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources'

/**
 * Extraction Model client instance
 */
export let extractionModelClient: OpenAI

/**
 * Initialize Extraction Model client
 * @param apiKey Extraction Model API key
 * @param baseURL Extraction Model base URL
 * @param timeout Extraction Model timeout
 */
export const initExtractionClient = (apiKey: string, baseURL: string, timeout: number = 10000) => {
	if (!apiKey || !baseURL) throw 'INVALID_EXTRACTION_MODEL_CREDENTIALS'

	extractionModelClient = new OpenAI({ apiKey, baseURL, timeout })
}

/**
 * Extract specific content from a conversation
 * @param messages messages to extract
 * @param model extract model name
 * @param temperature extraction temperature
 * @returns extracted content string
 */
export const extractContent = async (
    messages: ChatCompletionMessageParam[],
    model: string,
    temperature: number = 0,
): Promise<string> => {
    if (!extractionModelClient) throw 'EXTRACTION_MODEL_CLIENT_NOT_INITIALIZED'
    if (!Array.isArray(messages) || messages.length === 0) throw 'INVALID_MESSAGES'
    if (!model) throw 'INVALID_MODEL'

    let completion: ChatCompletion
    try {
        completion = await extractionModelClient.chat.completions.create({
            model,
            messages,
            temperature,
        })
    } catch (e) {
        console.error('Failed to extract specific content:', e)
        throw 'FAILED_EXTRACT_CONTENT'
    }

    const content = completion.choices[0]?.message.content
    if (!content) throw 'INVALID_COMPLETION_CONTENT'

    return content
}
