/**
 * Application level (Process Level) Handlers
 */
import { initRedisModules, initLlmModules, initHTTPServer, stopRedisModules, stopChromaModules, stopHTTPServer, initMcpModules, stopMcpModules } from '../init'
import { SERVICE_NAME, VECTOR_STORE } from '../config'

/**
 * Custom process event handler: SIGSTART
 * Handles service startup signal
 * @param e signal name
 */
export const SIGSTART_HANDLER = async (e: string): Promise<void> => {
    console.log(`-------- ${new Date()} --------\n         SIGNAL: ${e}\n${SERVICE_NAME} initialisation STARTED`)

    try {
        await initLlmModules()
        await initRedisModules()
        // await initMcpModules()
        // initHTTPServer()
        // @ts-ignore
        process.serverStatus = 'ready'
        console.log(`-------- ${new Date()} --------\n         ${SERVICE_NAME} initialisation ready!\n         Waiting for HTTP server...\n`)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

/**
 * SIGINT/SIGTERM handler
 * Handles graceful shutdown signal
 * @param e signal event
 */
export const SIGINTTERM_HANDLER = async (e: any): Promise<void> => {
    console.log(`\n\n\n${new Date(Date.now())}\ne: ${e}\ngracefully shutting down ...`)
    process.env.DID_MANUALLY_SHUTDOWN = 'yes'

    try {
        await stopRedisModules()
        await stopMcpModules()
        // await stopPostgresModules()
        VECTOR_STORE === 'chroma' ? stopChromaModules() : null
        // stopHTTPServer()
    } catch (err) {
        console.log(`The shutdown is not so graceful, ${err}`)
    }

    console.log('BYE')
    process.exit(0)
}

/**
 * Uncaught exception handler
 * @param e exception object
 */
export const UNCAUGHTEXCEPTION_HANDLER = async (e: any): Promise<void> => {
    console.error(`\n${new Date(Date.now())}\nUNCAUGHTEXCEPTION_HANDLER: ${e}`)
    process.exit(1)
}

/**
 * Custom process event handler: shutdown on failure
 * @param e failure event
 */
export const FAILURE_SHUTDOWN_HANDLER = async (e: any): Promise<void> => {
    console.error(`\n${new Date(Date.now())}\nFAILURE_SHUTDOWN_HANDLER: ${e}`)
    process.env.DID_MANUALLY_SHUTDOWN = 'yes'

    try{
        await stopHTTPServer()
    } catch (err) {
        console.error('Error when shutting down HTTP Server: ', err)
    }

    process.exit(1)
}
