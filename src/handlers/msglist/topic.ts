/**
 * Topic Message List Handler
 */
import { summarizeTopic } from '../../workflows/topic'
import type { SummarizeTopicInput, SummarizeTopicOutput } from '../../type'

/**
 * Handle topic summarization task
 * @param input topic summarization input
 * @returns topic summarization output
 */
export const onTopicTask = async (input: SummarizeTopicInput): Promise<SummarizeTopicOutput> => {
	console.log('onTopicTask() input: ', input)

	let res: SummarizeTopicOutput
    try {
        res = await summarizeTopic(input)
    } catch (e) {
        console.error('onTopicTask() error: ', e)
        throw e
    }

    console.log('onTopicTask() output: ', res)
    return res
}

/**
 * Handle topic summarization task error
 * @param e error
 * @param input topic summarization input
 */
export const onTopicTaskError = async (e:unknown, input: SummarizeTopicInput) => {
	console.error('onTopicTaskError() error: ', e)
    console.error('onTopicTaskError() failed input: ', input)
}

/**
 * Handle topic summarization task failure
 * @param e error
 * @param input topic summarization input
 */
export const onTopicTaskFailure = async (e:unknown, input: SummarizeTopicInput) => {
	console.error('onTopicTaskFailure() error: ', e)
	console.error('onTopicTaskFailure() failed input: ', input)
}
