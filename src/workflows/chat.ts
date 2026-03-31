import { randomUUID } from 'crypto'
import { appendHistoryStep, generateReplyStep, loadHistoryStep, retrieveMemoryStep, retrieveKnowledgeStep, retrieveTopicStep } from '../steps'
import { parseBooleanFlag } from '../util'
import type { ChatInput, ChatOutput, StepConfig, TaskContext } from '../type'

export const chat = async (input: ChatInput): Promise<ChatOutput> => {
    input.conversationId = input.conversationId || '11111111-1111-1111-1111-111111111111'
    let context: TaskContext<'chat'> = {
        taskId: randomUUID(),
        workflow: 'chat',
        input,
        output: {
            conversationId: input.conversationId,
            reply: '',
        },
        steps: {},
        meta: {},
    }

    const steps: StepConfig<'chat'>[] = [
        {
            name: 'retrieveMemory',
            run: retrieveMemoryStep,
            enabled: parseBooleanFlag(input.config?.ltmEnabled, true),
            waitForCompletion: true,
            onError: 'continue',
        },
        {
            name: 'retrieveKnowledge',
            run: retrieveKnowledgeStep,
            enabled: parseBooleanFlag(input.config?.ragEnabled, true),
            waitForCompletion: true,
            onError: 'continue',
        },
        {
            name: 'retrieveTopic',
            run: retrieveTopicStep,
            enabled: parseBooleanFlag(input.config?.topicEnabled, true),
            waitForCompletion: true,
            onError: 'continue',
        },
        {
            name: 'loadHistory',
            run: loadHistoryStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'continue',
        },
        {
            name: 'generateReply',
            run: generateReplyStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'abort',
        },
        {
            name: 'appendHistory',
            run: appendHistoryStep,
            enabled: true,
            waitForCompletion: false,
            onError: 'continue',
        },
    ]

    for (const step of steps) {
        if (!step.enabled) {
            context.steps[step.name] = { status: 'skipped' }
            continue
        }
        if (step.waitForCompletion) {
            try {
                context = await step.run(context)
                context.steps[step.name] = { status: 'success' }
            } catch (e: any) {
                console.error(`Failed to run step: ${step.name}`, e)
                context.steps[step.name] = { status: 'failed', error: String(e) }
                if (step.onError === 'abort') throw e
            }
        } else {
            Promise.resolve(step.run(context))
                .then(() => {
                    context.steps[step.name] = { status: 'success' }
                })
                .catch((e: any) => {
                    console.error(`Failed to run step: ${step.name}`, e)
                    context.steps[step.name] = { status: 'failed', error: String(e) }
                })
        }
    }
    console.log('--------------',context.meta)

    return context.output
}
