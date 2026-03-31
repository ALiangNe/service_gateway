/**
 * Define HTTP Response Error Object
 */
export const errObj = {
    200: { errno: 0, errmsg: 'OK' },
    400: { errno: 400, errmsg: 'Bad Request' },
    401: { errno: 401, errmsg: 'Unauthorized' },
    403: { errno: 403, errmsg: 'Forbidden' },
    404: { errno: 404, errmsg: 'Not Found' },
    429: { errno: 429, errmsg: 'Too Many Requests' },
    500: { errno: 500, errmsg: 'Internal Server Error' },
    503: { errno: 503, errmsg: 'Service Not Ready' }
}
