import { randomUUID } from 'crypto'
import { ingestKnowledgeStep } from '../steps'
import type { IngestKnowledgeInput, IngestKnowledgeOutput, StepConfig, TaskContext } from '../type'

export const ingestKnowledge = async (input: IngestKnowledgeInput): Promise<IngestKnowledgeOutput> => {
    let context: TaskContext<'knowledge'> = {
        taskId: randomUUID(),
        workflow: 'knowledge',
        input,
        output: { knowledgeIds: [] },
        steps: {},
        meta: {},
    }

    const steps: StepConfig<'knowledge'>[] = [
        {
            name: 'ingestKnowledge',
            run: ingestKnowledgeStep,
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
