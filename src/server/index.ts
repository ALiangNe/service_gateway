import express from 'express'
import cors from 'cors'
import type { Server } from 'http'
import { ipCheck, logRequest } from './midwares/auth'
import healthRouter from './apis/health'

const listener = express()

// Disable X-Powered-By header
listener.disable('x-powered-by')

// CORS
listener.use(cors({ origin: '*' }))

// Request logging
listener.use(logRequest)

// IP whitelist (strictly enforced in non-dev environments)
listener.use(ipCheck)

// Load APIs
listener.use('/', healthRouter)

/**
 * Initialize API layer: attach shared state and include all routers.
 */
export const startHTTPServer = (port: number): Server => {
    let server: Server | undefined
    try {
        server = listener.listen(port, () => { console.log(`HTTP Server listening at port ${port}`) })
    } catch (e) {
        console.error('Error when starting HTTP server: ', e)
        process.emit('SIGINT')
    }

    if (!server) {
        console.error('Failed to start HTTP server')
        process.emit('SIGINT')
    }

    server!.on('error', (err: any) => {
        console.error('HTTP Server error: ', { ...err })
        process.emit('SIGINT', err.code)
    })

    server!.on('close', () => {
        console.log('HTTP Server closed')
    })

    return server!
}
