import type { Request, Response, NextFunction } from 'express'
import { health_ } from './handlers'

/**
 * Liveness probe middleware
 */
export const _health = async (req: Request, res: Response, next: NextFunction) => {
    console.log('health probe request: ', req.query)

    let result
    try {
        result = await health_()
    } catch (e) {
        console.error('Error when calling health handler: ', e)
        res.status(500).json({ errno: 5000, errmsg: 'FAILED_HEALTH_PROBE', message: String(e) })
        return
    }
    res.status(200).json({ errno: 0, errmsg: 'SUCCESS', data: result })
}
