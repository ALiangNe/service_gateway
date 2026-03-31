/**
 * Message List module, use redis by default
 */
import { createClient } from 'redis'
import type { RedisClientType } from 'redis'
import type { RedisCredential } from '../type'

/**
 * Message List Redis client instance
 */
export let msgListListener: RedisClientType

/**
 * Initialize Message List Redis connection (independent client for blocking listening)
 * @param config Redis connection configuration
 */
export const initMessageList = async (config: RedisCredential) => {
    const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, onReady, onError, onReconnecting } = config

    if (!REDIS_HOST || !REDIS_PORT || !REDIS_PASSWORD) throw 'INVALID_REDIS_CREDENTIALS'
    if (!onReady || typeof onReady !== 'function') throw 'MISSING_CALLBACK_ONREADY'
    if (!onError || typeof onError !== 'function') throw 'MISSING_CALLBACK_ONERROR'
    if (!onReconnecting || typeof onReconnecting !== 'function') throw 'MISSING_CALLBACK_ONRECONNECTING'

    msgListListener = createClient({ url: `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}` })

    try {
        await msgListListener.connect()
        await msgListListener.ping()
    } catch (e) {
        console.error('Error when create redis:msglist!', e)
        throw 'FAILED_CREATE_REDIS_MSGLIST_CLIENT'
    }

    msgListListener.on('ready', onReady)
    msgListListener.on('error', onError)
    msgListListener.on('reconnecting', onReconnecting)
}

/**
 * Disconnect Message List Redis connection
 * @param force whether to force disconnect, default false
 * @returns returns 1 on success, 0 if not initialized
 */
export const disconnectMessageList = (force: boolean = false): number => {
    if (!msgListListener) return 0

    try {
        force ? msgListListener.disconnect() : msgListListener.quit()
    }
    catch (e) {
        console.error('Failed disconnect from redis:msglist!', e)
        throw 'FAILED_DISCONNECT_REDIS_MSGLIST_CLIENT'
    }

    console.log('Disconnected from redis:msglist!')
    return 1
}

/**
 * Blocking listen to Redis List
 * @param keylist list of keys to listen to
 * @param timeout timeout in seconds, 0 means infinite wait
 * @param showErr whether to throw exception on error
 * @returns list item or null if timeout
 */
export const watchList = async (keylist: string[], timeout: number, showErr: boolean = false): Promise<{ key: string, element: string } | null> => {
    if (!msgListListener) throw 'REDIS_MSGLIST_CLIENT_NOT_INITIALIZED'
    if (!keylist || !Array.isArray(keylist) || keylist.length === 0) throw 'MISSING_PARAMETER_KEY'
    if (typeof timeout !== 'number' || timeout < 0) throw 'INVALID_PARAMETER_TIMEOUT'

    let res
    try {
        res = await msgListListener.blPop(keylist, timeout)
    } catch (e) {
        if (!showErr) return null
        throw 'FAILED_WATCH_LIST'
    }
    return res
}
