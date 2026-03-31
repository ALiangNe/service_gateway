/**
 * Memory Message List Handler
 */
import { extractMemory } from '../../workflows/memory'
import type { ExtractMemoryInput, ExtractMemoryOutput } from '../../type'

/**
 * Handle memory extraction task
 * @param input memory extraction input
 * @returns memory extraction output
 */
export const onMemoryTask = async (input: ExtractMemoryInput): Promise<ExtractMemoryOutput> => {
	console.log('onMemoryTask() input: ', input)

	let res: ExtractMemoryOutput
    try {
        res = await extractMemory(input)
    } catch (e) {
        console.error('onMemoryTask() error: ', e)
        throw e
    }

    console.log('onMemoryTask() output: ', res)
    return res
}

/**
 * Handle memory extraction task error
 * @param e error
 * @param input memory extraction input
 */
export const onMemoryTaskError = async (e:unknown, input: ExtractMemoryInput) => {
	console.error('onMemoryTaskError() error: ', e)
    console.error('onMemoryTaskError() failed input: ', input)
}

/**
 * Handle memory extraction task failure
 * @param e error
 * @param input memory extraction input
 */
export const onMemoryTaskFailure = async (e:unknown, input: ExtractMemoryInput) => {
	console.error('onMemoryTaskFailure() error: ', e)
	console.error('onMemoryTaskFailure() failed input: ', input)
}
