import { randomUUID } from 'crypto'
import { loadHistoryStep, summarizeTopicStep, storeTopicStep } from '../steps'
import type { StepConfig, SummarizeTopicInput, SummarizeTopicOutput, TaskContext } from '../type'

export const summarizeTopic = async (input: SummarizeTopicInput): Promise<SummarizeTopicOutput> => {
    let context: TaskContext<'topic'> = {
        taskId: randomUUID(),
        workflow: 'topic',
        input,
        output: { topicIds: [] },
        steps: {},
        meta: {},
    }

    const steps: StepConfig<'topic'>[] = [
        {
            name: 'loadHistory',
            run: loadHistoryStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'abort',
        },
        {
            name: 'summarizeTopic',
            run: summarizeTopicStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'abort',
        },
        {
            name: 'storeTopic',
            run: storeTopicStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'abort',
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

    return context.output
}
