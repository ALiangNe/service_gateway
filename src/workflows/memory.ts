import { randomUUID } from 'crypto'
import { extractMemoryStep, loadHistoryStep, storeMemoryStep } from '../steps'
import type { ExtractMemoryInput, ExtractMemoryOutput, StepConfig, TaskContext } from '../type'

export const extractMemory = async (input: ExtractMemoryInput): Promise<ExtractMemoryOutput> => {
    let context: TaskContext<'memory'> = {
        taskId: randomUUID(),
        workflow: 'memory',
        input,
        output: { memoryIds: [] },
        steps: {},
        meta: {},
    }

    const steps: StepConfig<'memory'>[] = [
        {
            name: 'loadHistory',
            run: loadHistoryStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'abort',
        },
        {
            name: 'extractMemory',
            run: extractMemoryStep,
            enabled: true,
            waitForCompletion: true,
            onError: 'abort',
        },
        {
            name: 'storeMemory',
            run: storeMemoryStep,
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
