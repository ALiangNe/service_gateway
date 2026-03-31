/**
 * Cache module, use redis by default
 */
import { createClient } from 'redis'
import type { RedisClientType, SetOptions } from 'redis'
import type { RedisCredential } from '../type'

/**
 * Cache Redis client instance
 */
export let redisClient: RedisClientType

/**
 * Initialize Redis connection
 * @param config Redis connection configuration
 */
export const initCache = async (config: RedisCredential) => {
    const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, onReady, onError, onReconnecting } = config

    if (!REDIS_HOST || !REDIS_PORT || !REDIS_PASSWORD) throw 'INVALID_REDIS_CREDENTIALS'
    if (!onReady || typeof onReady !== 'function') throw 'MISSING_CALLBACK_ONREADY'
    if (!onError || typeof onError !== 'function') throw 'MISSING_CALLBACK_ONERROR'
    if (!onReconnecting || typeof onReconnecting !== 'function') throw 'MISSING_CALLBACK_ONRECONNECTING'

    redisClient = createClient({ url: `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}` })

    try {
        await redisClient.connect()
        await redisClient.ping()
    } catch (e) {
        console.error('Error when create redis:cache!', e)
        throw 'FAILED_CREATE_REDIS_CLIENT'
    }

    redisClient.on('ready', onReady)
    redisClient.on('error', onError)
    redisClient.on('reconnecting', onReconnecting)
}

/**
 * Disconnect Redis connection
 * @returns returns 1 on success, 0 if not initialized
 */
export const disconnectCache = async (): Promise<number> => {
    if (!redisClient) return 0
    try {
        await redisClient.quit()
    } catch (e) {
        console.error('Failed disconnect from redis:cache!', e)
        throw 'FAILED_DISCONNECT_REDIS_CLIENT'
    }
    return 1
}

/**
 * Write string
 * @param id key name
 * @param value value
 * @param ttl TTL in seconds, default 1 hour, 0 means no expiration
 * @param nx set only if key does not exist
 * @param xx set only if key exists
 * @returns string or null
 */
export const setString = async (id: string, value: string, ttl: number = 3600, nx: boolean = false, xx: boolean = false): Promise<string | null> => {
    if (!redisClient) throw 'CACHE_NOT_INITIALIZED'
    if (!id) throw 'MISSING_PARAMETER_ID'
    if (!value) throw 'MISSING_PARAMETER_VALUE'
    if (typeof ttl !== 'number' || ttl < 0) throw 'INVALID_PARAMETER_TTL'
    if (nx && xx) throw 'NX_AND_XX_CANNOT_BOTH_BE_TRUE'

    let res
    try {
        const options: SetOptions = {}
        if (ttl > 0) options.EX = ttl
        if (nx) options.NX = true
        if (xx) options.XX = true
        res = await redisClient.set(id, value, options)
    } catch (e) {
        console.error('Failed set string to redis:cache!', e)
        throw 'FAILED_SET_STRING_TO_CACHE'
    }
    return res
}

/**
 * Read string
 * @param id key name
 * @returns cached string
 */
export const getStringById = async (id: string): Promise<string> => {
    if (!redisClient) throw 'CACHE_NOT_INITIALIZED'
    if (!id) throw 'MISSING_PARAMETER_ID'

    let res
    try {
        res = await redisClient.get(id)
    } catch (e) {
        console.error('Failed get string from redis:cache!', e)
        throw 'FAILED_GET_STRING_FROM_CACHE'
    }
    if (!res) throw 'FAILED_GET_STRING_FROM_CACHE'
    return res
}

/**
 * Delete string
 * @param id key name
 * @returns number of keys deleted
 */
export const delStringById = async (id: string): Promise<number> => {
    if (!redisClient) throw 'CACHE_NOT_INITIALIZED'
    if (!id) throw 'MISSING_PARAMETER_ID'

    let res = 0
    try {
        res = await redisClient.del(id)
    } catch (e) {
        console.error('Failed delete string from redis:cache!', e)
        throw 'FAILED_DELETE_STRING_FROM_CACHE'
    }
    return res
}

/**
 * Push to Redis List, and trim list to max length if provided
 * @param l_r push direction, 'L' for left, 'R' for right, default 'R'
 * @param key key to push to
 * @param data data to push
 * @param ttl TTL in seconds, default 1 hour, 0 means no expiration
 * @returns list length after operation
 */
export const pushToList = async (l_r: 'L' | 'R' = 'R', key: string, data: string, ttl: number = 3600): Promise<number> => {
    if (!redisClient) throw 'REDIS_CLIENT_NOT_INITIALIZED'
    if (!key) throw 'MISSING_PARAMETER_KEY'
    if (!data) throw 'MISSING_PARAMETER_DATA'
    if (typeof ttl !== 'number' || ttl < 0) throw 'INVALID_PARAMETER_TTL'

    let res = 0
    try {
        if (l_r === 'L') res = await redisClient.LPUSH(key, data)
        if (l_r === 'R') res = await redisClient.RPUSH(key, data)
        if (ttl > 0) await redisClient.EXPIRE(key, ttl)
    } catch (e) {
        console.error('Failed push to redis:cache!', e)
        throw 'FAILED_PUSH_TO_REDIS_CACHE'
    }
    return res
}

/**
 * Pop from Redis List
 * @param l_r pop direction, 'L' for left, 'R' for right, default 'R'
 * @param key key to pop from
 * @returns popped element value
 */
export const popFromList = async (l_r: 'L' | 'R' = 'R', key: string): Promise<string> => {
    if (!redisClient) throw 'REDIS_CLIENT_NOT_INITIALIZED'
    if (!key) throw 'MISSING_PARAMETER_KEY'

    let res
    try {
        if (l_r === 'L') res = await redisClient.LPOP(key)
        if (l_r === 'R') res = await redisClient.RPOP(key)
    } catch (e) {
        console.error('Failed pop from redis:cache!', e)
        throw 'FAILED_POP_FROM_REDIS_CACHE'
    }
    if (!res) throw 'FAILED_POP_FROM_REDIS_CACHE'
    return res
}

/**
 * Remove element from Redis List
 * @param key key to remove from
 * @param value value to remove
 * @param count number of elements to remove, 0 means remove all matches, default 0
 * @returns number of elements removed
 */
export const removeFromList = async (key: string, value: string, count: number = 0): Promise<number> => {
    if (!redisClient) throw 'REDIS_CLIENT_NOT_INITIALIZED'
    if (!key) throw 'MISSING_PARAMETER_KEY'
    if (!value) throw 'MISSING_PARAMETER_VALUE'

    let res = 0
    try {
        res = await redisClient.LREM(key, count, value)
    } catch (e) {
        console.error('Failed remove from redis:cache!', e)
        throw 'FAILED_REMOVE_FROM_REDIS_CACHE'
    }
    return res
}

/**
 * Iterate through List
 * @param config configuration object
 * @param config.key List key name
 * @param config.start start index
 * @param config.stop end index
 * @param config.success success callback function (optional)
 * @param config.fail failure callback function (optional)
 * @returns returns nothing if success callback is provided, otherwise returns list element array
 */
export const loopThroughList = async (config: {
    key: string
    start: number
    stop: number
    success?: Function
    fail?: Function
}): Promise<string[] | undefined> => {
    const { key, start = 0, stop = -1, success, fail } = config

    if (!redisClient) throw 'REDIS_CLIENT_NOT_INITIALIZED'
    if (!key) throw 'MISSING_PARAMETER_KEY'
    if (success && typeof success !== 'function') throw 'INVALID_CALLBACK_SUCCESS'
    if (fail && typeof fail !== 'function') throw 'INVALID_CALLBACK_FAIL'

    let res
    try {
        res = await redisClient.LRANGE(key, start, stop)
    } catch (e) {
        console.error('Failed loop through redis:cache!', e)
        if (!fail) throw 'FAILED_LOOP_THROUGH_REDIS_CACHE'
        fail(e)
        return
    }
    
    if (!success) return res
    success(res)
}
