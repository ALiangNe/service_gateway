/**
 * MCP module
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types'
import type { ChatCompletionFunctionTool } from 'openai/resources'

/**
 * MCP client instance and MCP tools
 */
export let mcpClient: Client
export let mcpTools: ChatCompletionFunctionTool[]

/**
 * Initialize MCP client, list MCP tools and store in mcpTools
 * @param baseURL MCP server base URL
 * @param accessToken MCP server access token
 */
export const initMcpClient = async (baseURL: string, accessToken?: string) => {
    if (!baseURL) throw 'INVALID_MCP_BASE_URL'

    mcpClient = new Client({
        name: 'mcp-client',
        version: '1.0.0',
    })

    const transport = new StreamableHTTPClientTransport(
        new URL(baseURL),
        {
            requestInit: {
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                },
            },
        },
    )

    try {
        await mcpClient.connect(transport)
    } catch (e) {
        console.error('Failed connect MCP client', e)
        throw 'FAILED_CONNECT_MCP_CLIENT'
    }

    // list MCP tools
    try {
        const res = await mcpClient.listTools()
        mcpTools = res.tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }))

        console.log('Found MCP tools length:', res.tools.length)
        console.log('MCP tools:', JSON.stringify(mcpTools, null, 2))
    } catch (e) {
        console.error('Failed list MCP tools', e)
        throw 'FAILED_LIST_MCP_TOOLS'
    }
}

/**
 * Disconnect MCP client
 * @returns returns 1 on success, 0 if not initialized
 */
export const disconnectMcpClient = async () => {
    if (!mcpClient) return 0
    try {
        await mcpClient.close()
    } catch (e) {
        console.error('Failed disconnect MCP client', e)
        throw 'FAILED_DISCONNECT_MCP_CLIENT'
    }
    return 1
}

/**
 * Call MCP tool
 * @param name tool name
 * @param args tool arguments
 * @param timeout tool call timeout
 * @returns MCP tool result
 */
export const callMcpTool = async (name: string, args?: Record<string, unknown>, timeout: number = 30000): Promise<CallToolResult> => {
    if (!mcpClient) throw 'MCP_CLIENT_NOT_INITIALIZED'
    if (!mcpTools.some(tool => tool.function.name === name)) throw 'INVALID_MCP_TOOL_NAME'

    let res: Awaited<ReturnType<typeof mcpClient.callTool>>
    try {
        res = await Promise.race([
            mcpClient.callTool({ name, arguments: args }),
            new Promise<never>((_, reject) => {
                setTimeout(() => reject('CALL_MCP_TOOL_TIMEOUT'), timeout)
            }),
        ])
    } catch (e) {
        console.error('Failed call MCP tool', e)
        throw 'FAILED_CALL_MCP_TOOL'
    }

    if (!('content' in res)) throw 'INVALID_MCP_TOOL_RESPONSE'
    return res as CallToolResult
}
