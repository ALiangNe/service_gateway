/**
 * LLM module
 */
import { OpenAI } from 'openai'
import type { ChatCompletion, ChatCompletionMessage, ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources'

/**
 * LLM client instance
 */
export let llmClient: OpenAI

/**
 * Initialize LLM client
 * @param apiKey LLM API key
 * @param baseURL LLM base URL
 * @param timeout LLM timeout
 */
export const initLlmClient = (apiKey: string, baseURL: string, timeout: number = 30000) => {
	if (!apiKey || !baseURL) throw 'INVALID_LLM_CREDENTIALS'

	llmClient = new OpenAI({ apiKey, baseURL, timeout })
}

/**
 * Chat completion
 * @param messages chat completion messages
 * @param model model name
 * @param temperature chat completion temperature
 * @param tools chat completion tools
 * @returns chat completion message result
 */
export const chatCompletion = async (
    messages: ChatCompletionMessageParam[],
    model: string,
    temperature?: number,
    tools?: ChatCompletionTool[]
): Promise<ChatCompletionMessage> => {
    if (!llmClient) throw 'LLM_CLIENT_NOT_INITIALIZED'
    if (!Array.isArray(messages) || messages.length === 0) throw 'INVALID_MESSAGES'
    if (!model) throw 'INVALID_MODEL'

    let completion: ChatCompletion
    try {
        completion = await llmClient.chat.completions.create({
            model,
            messages,
            temperature,
            ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
        })
    } catch (e) {
        console.error('Failed to create chat completion:', e)
        throw 'FAILED_CREATE_CHAT_COMPLETION'
    }

    const message = completion.choices[0]?.message
    if (!message) throw 'INVALID_COMPLETION_MESSAGE'

    return message
}
