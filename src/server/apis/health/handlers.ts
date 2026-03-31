import { Request, Response, NextFunction } from 'express'

/**
 * Liveness probe handler: server is alive.
 */
export const health_ = async (): Promise<string> => {
    return 'OK'
}
