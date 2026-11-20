/**
 * CSV for exports of user-entered data.
 *
 * A cell that a spreadsheet would run as a formula (it starts with `=`,
 * `+`, `-`, `@`, tab or carriage return) gets a leading `'` so it stays
 * text (CSV injection). Every cell is quoted. Objects are written as JSON.
 */

const FORMULA_START = /^[=+\-@\t\r]/
const BYTE_ORDER_MARK = '\uFEFF'

export function csvCell(value: unknown): string {
  let text: string
  if (value === null || value === undefined) {
    text = ''
  } else if (value instanceof Date) {
    text = value.toISOString()
  } else if (typeof value === 'object') {
    text = JSON.stringify(value)
  } else {
    text = String(value)
  }
  if (FORMULA_START.test(text)) {
    text = `'${text}`
  }
  return `"${text.replace(/"/g, '""')}"`
}

/**
 * Rows → CSV text with CRLF line endings and a UTF-8 byte order mark, so
 * Excel opens non-ASCII text correctly.
 */
export function toCsv(rows: unknown[][]): string {
  return `${BYTE_ORDER_MARK}${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

/**
 * Headers for a CSV download. The file name is reduced to safe characters
 * so it cannot break the header.
 *
 * @example
 * for (const [name, value] of Object.entries(csvDownloadHeaders('orders.csv'))) {
 *   response.header(name, value)
 * }
 * response.send(toCsv(rows))
 */
export function csvDownloadHeaders(fileName: string): Record<string, string> {
  const safe = fileName.replace(/[^\w.-]+/g, '_') || 'export.csv'
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${safe}"`,
  }
}
