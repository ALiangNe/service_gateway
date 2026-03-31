import fs from 'node:fs/promises'
import type { ChatCompletionMessageFunctionToolCall, ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types'
import { LLM_MODEL, CHAT_TEMPERATURE, MCP_MAX_ITERATIONS, MCP_TIMEOUT } from '../config'
import { chatCompletion } from '../modules/llm'
import { mcpTools, callMcpTool } from '../modules/mcp'
import type { ChatHistoryRecord, MCPToolCallResult, TaskContext } from '../type'

const parseToolResult = (name: string, result: CallToolResult): string => {
    if (result.isError) return 'Tool call failed'

    const texts = result.content.filter(block => block.type === 'text').map(block => block.text)
    switch (name) {
        case '':
            return texts.join('\n')
        default:
            return texts.join('\n')
    }
}

export const generateReplyStep = async <T extends 'chat'>(context: TaskContext<T>): Promise<TaskContext<T>> => {
    const { userId, content, config } = context.input
    if (!userId || !content) throw 'MISSING_REQUIRED_PARAMETER'
    
    const historyRecords = context.meta.historyRecords as ChatHistoryRecord[] | undefined
    const historyMessages = historyRecords
        ? historyRecords.map(r => ({ role: r.role, content: `[${r.userId}] ${r.content}` }))
        : []
    if (historyMessages.length === 0) {
        console.warn('No user history records found for user id: ', userId)
    }

    // build system prompt
    let systemPromptTemplate = ''
    try {
        systemPromptTemplate = await fs.readFile('prompts/bot/chat.txt', 'utf-8')
    } catch (e) {
        console.error('Failed to read system prompt', e)
        throw 'FAILED_READ_SYSTEM_PROMPT'
    }
    
    const blocks: string[] = []

    // add user's long-term memory
    const userMemories = context.meta.userMemories as string[] | undefined
    if (Array.isArray(userMemories) && userMemories.length > 0) {
        blocks.push('## Long-term memory\n'
            + 'User-specific persistent facts and preferences:\n'
            + userMemories.map(m => `- ${m}`).join('\n'))
    }

    // add retrieved knowledge
    const retrievedKnowledge = context.meta.retrievedKnowledge as string[] | undefined
    if (Array.isArray(retrievedKnowledge) && retrievedKnowledge.length > 0) {
        blocks.push('## Knowledge\n'
            + 'External retrieved information:\n'
            + retrievedKnowledge.map(k => `- ${k}`).join('\n'))
    }

    // add retrieved conversation topics
    const retrievedTopics = context.meta.retrievedTopics as string[] | undefined
    if (Array.isArray(retrievedTopics) && retrievedTopics.length > 0) {
        blocks.push('## Conversation topics\n'
            + 'Relevant past conversation summaries:\n'
            + retrievedTopics.map(t => `- ${t}`).join('\n'))
    }

    const systemPrompt = systemPromptTemplate.replace('{{context}}', blocks.join('\n\n'))

    // build messages
    const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: `[${userId}] ${content}` },
    ]

    const tools = config?.mcpEnabled ? mcpTools : []
    const toolCallResults: MCPToolCallResult[] = []
    let iteration = 0
    let finalReply = ''

    while (iteration < MCP_MAX_ITERATIONS) {
        // call LLM, if last iteration, don't provide tools
        let message: ChatCompletionMessage
        try {
            message = await chatCompletion(messages, LLM_MODEL, CHAT_TEMPERATURE, iteration === MCP_MAX_ITERATIONS - 1 ? [] : tools)
        } catch (e) {
            console.error('Failed to call LLM', e)
            throw 'FAILED_CALL_LLM'
        }
        messages.push(message)

        //  if no tool calls, treat as final assistant reply
        const toolCalls = message.tool_calls as ChatCompletionMessageFunctionToolCall[] | undefined
        if (!toolCalls || toolCalls.length === 0) {
            finalReply = message.content ?? ''
            break
        }

        // call MCP tools
        const toolResults = await Promise.all(toolCalls.map(async (tool) => {
            let args: Record<string, any> = {}
            try {
                args = JSON.parse(tool.function.arguments)
            } catch (e) {
                console.error('Failed parse tool arguments', e)
                toolCallResults.push({
                    name: tool.function.name,
                    iteration,
                    status: 'failed',
                    error: 'INVALID_TOOL_ARGUMENTS',
                })
                return { toolId: tool.id, content: 'Failed to parse tool arguments' }
            }

            let result: CallToolResult
            try {
                result = await callMcpTool(tool.function.name, args, MCP_TIMEOUT)
                toolCallResults.push({
                    name: tool.function.name,
                    iteration,
                    status: 'success',
                })
            } catch (e) {
                toolCallResults.push({
                    name: tool.function.name,
                    iteration,
                    status: 'failed',
                    error: e instanceof Error ? e.message : String(e),
                })
                return { toolId: tool.id, content: 'Tool call failed' }
            }

            return { toolId: tool.id, content: parseToolResult(tool.function.name, result) }
        }))

        // add tool results to messages
        messages.push(...toolResults.map(toolResult => ({
            role: 'tool' as const,
            tool_call_id: toolResult.toolId,
            content: toolResult.content,
        })))

        iteration++
    }

    context.meta.toolCallResults = toolCallResults
    context.meta.reply = finalReply
    context.output.reply = finalReply
    return context
}
