import axios from 'axios'
import { createHash } from 'crypto'

/**
 * Generate a hash ID from a string
 * @param text - text to generate a hash ID from
 * @returns generated hash ID
 */
export const hash = (text: string): string => {
    return createHash('sha256').update(text).digest('hex')
}

/**
 * Load a remote file
 * @param url - URL of the remote file
 * @returns content of the remote file
 */
export const loadRemoteFile = async (url: string): Promise<string> => {
    const response = await axios.get(url, { responseType: 'text' })
    return response.data as string
}

/**
 * Parse a boolean flag from a string or number
 * @param value - value to parse
 * @param defaultBool - default boolean value if the value is not a boolean
 * @returns parsed boolean value
 */
export const parseBooleanFlag = (value: unknown, defaultBool: boolean): boolean => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase()
        if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true
        if (['false', '0', 'no', 'n', 'off'].includes(v)) return false
    }
    return defaultBool
}
