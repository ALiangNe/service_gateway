/**
 * Message List event handler
 */
import { watchList } from '../../modules/msglist'
import { pushToList } from '../../modules/cache'
import type { ChatInput, ExtractMemoryInput, IngestKnowledgeInput, MsgListTask, SummarizeTopicInput } from '../../type'
import { onGeneralError, onGeneralFailure, onParseError } from './error'
import { onChatTask, onChatTaskError, onChatTaskFailure } from './chat'
import { onKnowledgeTask, onKnowledgeTaskError, onKnowledgeTaskFailure } from './knowledge'
import { onMemoryTask, onMemoryTaskError, onMemoryTaskFailure } from './memory'
import { onTopicTask, onTopicTaskError, onTopicTaskFailure } from './topic'

export const onReady = () => {
    console.log('msglist: redis client is ready')
}

export const onError = (e: unknown) => {
    console.error('msglist: redis client error: ', e)
}

export const onReconnecting = () => {
    console.log(`\n------ ${new Date()} ------`)
    console.log('msglist: redis client is reconnecting ...')
}

/**
 * Blocking listen to task queue
 * @param msgList list of queue keys to listen to
 */
export const onListListening = async (msgList: string[]) => {
    let res: { key: string; element: any } = { key: '', element: null }

    while (true) {
        // @ts-ignore
        process.isProcessingMessageListJob = false

        console.log('\n\nonListListening() waiting for list item ...')
        try {
            // @ts-ignore
            res = await watchList(msgList, 0, process.env.DID_MANUALLY_SHUTDOWN === 'yes')
        } catch (e) {
            console.error('watchList() failed: ', e)
            break
        }

        // @ts-ignore
		if (process.env.DID_MANUALLY_SHUTDOWN === 'yes' && !res) {
			break
		}

        // @ts-ignore
		process.isProcessingMessageListJob = true

        let elementObj: MsgListTask
        try {
            elementObj = JSON.parse(res.element)
        } catch (e) {
            onParseError(e, res.element)
            elementObj = res.element
        }

        const keys = res.key.split(':')
        if (keys.length !== 3) {
            console.error('ERROR: unexpected key format: ', res.key)
            continue
        }

        const [major, task, status] = keys
        let result: any
        try {
            if (task.toLowerCase() === 'chat') result = await onChatTask(elementObj.data as ChatInput)
            if (task.toLowerCase() === 'knowledge') result = await onKnowledgeTask(elementObj.data as IngestKnowledgeInput)
            if (task.toLowerCase() === 'memory') result = await onMemoryTask(elementObj.data as ExtractMemoryInput)
            if (task.toLowerCase() === 'topic') result = await onTopicTask(elementObj.data as SummarizeTopicInput)
        } catch (e) {
            if (task.toLowerCase() === 'chat') await onChatTaskError(e, elementObj.data as ChatInput)
            if (task.toLowerCase() === 'knowledge') await onKnowledgeTaskError(e, elementObj.data as IngestKnowledgeInput)
            if (task.toLowerCase() === 'memory') await onMemoryTaskError(e, elementObj.data as ExtractMemoryInput)
            if (task.toLowerCase() === 'topic') await onTopicTaskError(e, elementObj.data as SummarizeTopicInput)
            continue
        }

        try {
            if (!result && task.toLowerCase() === 'chat') await onChatTaskFailure('NO_RESULT_FROM_ONTASK', elementObj.data as ChatInput)
            if (!result && task.toLowerCase() === 'knowledge') await onKnowledgeTaskFailure('NO_RESULT_FROM_ONTASK', elementObj.data as IngestKnowledgeInput)
            if (!result && task.toLowerCase() === 'memory') await onMemoryTaskFailure('NO_RESULT_FROM_ONTASK', elementObj.data as ExtractMemoryInput)
            if (!result && task.toLowerCase() === 'topic') await onTopicTaskFailure('NO_RESULT_FROM_ONTASK', elementObj.data as SummarizeTopicInput)
        } catch (e) {
            onGeneralFailure(e, result, elementObj)
            continue
        }

        try {
            await pushToList('R', `llm:${task}:SUCCESS`, JSON.stringify({ ...elementObj, data: result }))
        } catch (e) {
            onGeneralError(e, result)
            continue
        }
    }
}
