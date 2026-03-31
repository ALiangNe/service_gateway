import { Server } from 'http'
import { HTTP_PORT, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, MSG_LIST_LISTEN, PG_HOST, PG_PORT, PG_USERNAME, PG_PASSWORD, PG_DATABASE, CHROMA_HOST, CHROMA_PORT, CHROMA_TENANT, CHROMA_DATABASE, LLM_API_KEY, LLM_BASE_URL, LLM_TIMEOUT, EMBEDDING_MODEL_API_KEY, EMBEDDING_MODEL_BASE_URL, EXTRACTION_MODEL_API_KEY, EXTRACTION_MODEL_BASE_URL, MCP_BASE_URL, MCP_ACCESS_TOKEN } from './config'
import * as msgListHandlers from './handlers/msglist'
import { startHTTPServer } from './server'
import { initCache, disconnectCache } from './modules/cache'
import { initMessageList, disconnectMessageList } from './modules/msglist'
import { initPgClient, disconnectPgClient } from './modules/pg'
import { initChromaClient, disconnectChromaClient } from './modules/chroma'
import { initLlmClient } from './modules/llm'
import { initExtractionClient } from './modules/extraction'
import { initEmbeddingClient } from './modules/embedding'
import { disconnectMcpClient, initMcpClient } from './modules/mcp'
import { runEmbeddingTest } from './script/embed_test'

let server: Server | null = null

/**
 * Initialize HTTP server
 */
export const initHTTPServer = () => {
    console.time('initialize http server')
	server = startHTTPServer(HTTP_PORT)
	console.timeEnd('initialize http server')
}

/**
 * Stop HTTP server
 */
export const stopHTTPServer = () => {
    if (!server) return
    server.close()
    server = null
}

/**
 * Initialize Redis modules
 */
export const initRedisModules = async () => {
    console.time('initialize redis cache')
    try {
        await initCache({
            REDIS_HOST,
            REDIS_PORT,
            REDIS_PASSWORD,
            onReady: () => { console.log('Redis cache ready in LLM_SERVICE') },
            onError: (e: any) => { console.error('Redis cache error in LLM_SERVICE: ', e) },
            onReconnecting: () => { console.log('Redis cache reconnecting in LLM_SERVICE') }
        })
    } catch (e) {
        console.error('Failed initialize redis cache', e)
        throw e
    }
    console.timeEnd('initialize redis cache')

    console.time('initialize redis msglist')
    try {
        await initMessageList({
            REDIS_HOST,
            REDIS_PORT,
            REDIS_PASSWORD,
            onReady: msgListHandlers.onReady,
            onError: msgListHandlers.onError,
            onReconnecting: msgListHandlers.onReconnecting
        })
    } catch (e) {
        console.error('Failed initialize redis msglist', e)
        throw e
    }
    console.timeEnd('initialize redis msglist')

    if (MSG_LIST_LISTEN && MSG_LIST_LISTEN.length > 0) {
        console.time('initialize redis msglist listener')
        try {
            msgListHandlers.onListListening(MSG_LIST_LISTEN)
        } catch (e) {
            console.error('Failed initialize redis msglist listener', e)
            throw e
        }
        console.timeEnd('initialize redis msglist listener')
    } else {
        console.log('MSG_LIST_LISTEN is empty, skip initializing redis msglist listener')
    }
}

/**
 * Stop Redis modules
 */
export const stopRedisModules = async () => {
    console.time('stop redis modules')
    try {
        await disconnectCache()
        disconnectMessageList()
    } catch (e) {
        console.error('Failed stop redis modules', e)
    }
    console.timeEnd('stop redis modules')
}

/**
 * Initialize PostgreSQL modules
 */
export const initPostgresModules = async () => {
    console.time('initialize postgresql modules')
    try {
        await initPgClient({ PG_HOST, PG_PORT, PG_USERNAME, PG_PASSWORD, PG_DATABASE })
    } catch (e) {
        console.error('Failed initialize postgresql modules', e)
        throw e
    }
    console.timeEnd('initialize postgresql modules')
}

/**
 * Stop PostgreSQL modules
 */
export const stopPostgresModules = async () => {
    console.time('stop postgresql modules')
    try {
        await disconnectPgClient()
    } catch (e) {
        console.error('Failed stop postgresql modules', e)
    }
    console.timeEnd('stop postgresql modules')
}

/**
 * Initialize Chroma modules
 */
export const initChromaModules = () => {
    console.time('initialize chroma modules')
    try {
        initChromaClient({ CHROMA_HOST, CHROMA_PORT, CHROMA_TENANT, CHROMA_DATABASE })
    } catch (e) {
        console.error('Failed initialize chroma modules', e)
        throw e
    }
    console.timeEnd('initialize chroma modules')
}

/**
 * Stop Chroma modules
 */
export const stopChromaModules = () => {
    console.time('stop chroma modules')
    try {
        disconnectChromaClient()
    } catch (e) {
        console.error('Failed stop chroma modules', e)
    }
    console.timeEnd('stop chroma modules')
}

/**
 * Initialize LLM modules
 */
export const initLlmModules = async () => {
    console.time('initialize llm modules')
    try {
        initLlmClient(LLM_API_KEY, LLM_BASE_URL, LLM_TIMEOUT)
        initExtractionClient(EXTRACTION_MODEL_API_KEY, EXTRACTION_MODEL_BASE_URL)
        initEmbeddingClient(EMBEDDING_MODEL_API_KEY, EMBEDDING_MODEL_BASE_URL)
        // await runEmbeddingTest()
    } catch (e) {
        console.error('Failed initialize llm modules', e)
        throw e
    }
    console.timeEnd('initialize llm modules')
}

/**
 * Initialize MCP modules
 */
export const initMcpModules = async () => {
    console.time('initialize mcp modules')
    try {
        await initMcpClient(MCP_BASE_URL, MCP_ACCESS_TOKEN)
    } catch (e) {
        console.error('Failed initialize mcp modules', e)
        throw e
    }
    console.timeEnd('initialize mcp modules')
}

/**
 * Stop MCP modules
 */
export const stopMcpModules = async () => {
    console.time('stop mcp modules')
    try {
        await disconnectMcpClient()
    } catch (e) {
        console.error('Failed stop mcp modules', e)
    }
    console.timeEnd('stop mcp modules')
}
