/**
 * Better Log module, better than console.log
 */

/**
 * Log object data in table format,
 * Cut extra long string to specified length, with '...' at the end
 * @param data - the data to log
 * @param keys - the keys to log
 * @param length - the length of string to keep, default is 60
 */
export const tableLog = (data: any, keys: string[], length: number = 60) => {
	const logData = JSON.parse(JSON.stringify(data))
	keys.forEach(key => {
		if (logData[key] && typeof logData[key] === 'string') {
			logData[key] = logData[key].length > length ? logData[key].substring(0, length) + '...' : logData[key]
		}
		if (logData[key] && Array.isArray(logData[key])) {
			let tempStr = '['
			logData[key].forEach(item => {
				tempStr += item.substring(0, Math.ceil(length / (logData[key].length * 1.2))) + '... , '
			})
			tempStr += ']'
			logData[key] = tempStr
		}
	})
	console.table(logData)
}
