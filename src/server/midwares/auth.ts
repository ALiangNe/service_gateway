import type { Request, Response, NextFunction } from 'express'
import { NODE_ENV, IP_WHITELIST } from '../../config'
import { errObj } from '../modules/errs'

/**
 * Unified request logging.
 */
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
    console.log(`\n\n---------- ${new Date().toISOString()} ----------`)
    console.log(`${req.method} ${req.originalUrl}  from ${req.ip}`)
    next()
}

/**
 * IP whitelist check.
 * - In dev environment, whitelist is skipped.
 * - In non-dev environments, only IPs in IP_WHITELIST are allowed.
 */
export const ipCheck = (req: Request, res: Response, next: NextFunction) => {
    if (NODE_ENV === 'dev') {
        next()
        return
    }
    if (!req.ip) {
        res.status(403).json(errObj[403])
        return
    }
    const ipArray = req.ip.split(':')
    const ip = ipArray[ipArray.length - 1]
    if (IP_WHITELIST.includes(ip)) {
        next()
        return
    }
    console.log('Unauthorized access from : ', ip)
    res.status(403).json(errObj[403])
}
