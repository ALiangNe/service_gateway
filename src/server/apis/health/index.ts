import { Router } from 'express'
import { _health } from './midwares'

export const router = Router()

router.get('/health', _health) // Liveness probe endpoint

export default router
