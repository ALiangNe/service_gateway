/**
 * Handlers for common errors in msglist processing
 */

/**
 * JSON parse error handler
 */
export const onParseError = (error: any, rawElement: string) => {
    console.error(__filename, '\n   msglist: JSON parse error')
    console.error(__filename, '\n   msglist: raw element: ', rawElement)
    // TODO - add further error handling logic here (e.g., logging to external service)
}

/**
 * Message processing error handler
 */
export const onGeneralError = (error: any, message: any) => {
    console.error(__filename, '\n   msglist: Message processing error: ', error)
    console.error(__filename, '\n   msglist: Failed message: ', message)
    // TODO - add further error handling logic here (e.g., logging to external service)
}

/**
 * Message processing failure handler
 */
export const onGeneralFailure = (error: any, result: any, elementObj: any) => {
    console.error(__filename, '\n   msglist: Message processing error: ', error)
    console.error(__filename, '\n   msglist: Failed message: ', result)
    console.error(__filename, '\n   msglist: Element object: ', elementObj)
    // TODO - add further error handling logic here (e.g., logging to external service)
}
