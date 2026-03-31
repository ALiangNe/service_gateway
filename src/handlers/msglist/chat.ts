/**
 * Chat Message List Handler
 */
import { chat } from '../../workflows/chat'
import type { ChatInput, ChatOutput } from '../../type'

/**
 * Handle chat task
 * @param input chat input
 * @returns chat output
 */
export const onChatTask = async (input: ChatInput): Promise<ChatOutput> => {
	console.log('onChatTask() input: ', input)

	let res: ChatOutput
    try {
        res = await chat(input)
    } catch (e) {
        console.error('onChatTask() error: ', e)
        throw e
    }

    console.log('onChatTask() output: ', res)
    return res
}

/**
 * Handle chat task error
 * @param e error
 * @param input chat input
 */
export const onChatTaskError = async (e:unknown, input: ChatInput) => {
	console.error('onChatTaskError() error: ', e)
    console.error('onChatTaskError() failed input: ', input)
}

/**
 * Handle chat task failure
 * @param e error
 * @param input chat input
 */
export const onChatTaskFailure = async (e:unknown, input: ChatInput) => {
	console.error('onChatTaskFailure() error: ', e)
	console.error('onChatTaskFailure() failed input: ', input)
}
