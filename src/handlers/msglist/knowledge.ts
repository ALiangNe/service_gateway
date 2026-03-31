/**
 * Knowledge Message List Handler
 */
import { ingestKnowledge } from '../../workflows/knowledge'
import type { IngestKnowledgeInput, IngestKnowledgeOutput } from '../../type'

/**
 * Handle knowledge ingestion task
 * @param input knowledge ingestion input
 * @returns knowledge ingestion output
 */
export const onKnowledgeTask = async (input: IngestKnowledgeInput): Promise<IngestKnowledgeOutput> => {
	console.log('onKnowledgeTask() input: ', input)
    
	let res: IngestKnowledgeOutput
    try {
        res = await ingestKnowledge(input)
    } catch (e) {
        console.error('onKnowledgeTask() error: ', e)
        throw e
    }

    console.log('onKnowledgeTask() output: ', res)
    return res
}

/**
 * Handle knowledge ingestion task error
 * @param e error
 * @param input knowledge ingestion input
 */
export const onKnowledgeTaskError = async (e:unknown, input: IngestKnowledgeInput) => {
	console.error('onKnowledgeTaskError() error: ', e)
    console.error('onKnowledgeTaskError() failed input: ', input)
}

/**
 * Handle knowledge ingestion task failure
 * @param e error
 * @param input knowledge ingestion input
 */
export const onKnowledgeTaskFailure = async (e:unknown, input: IngestKnowledgeInput) => {
	console.error('onKnowledgeTaskFailure() error: ', e)
	console.error('onKnowledgeTaskFailure() failed input: ', input)
}
