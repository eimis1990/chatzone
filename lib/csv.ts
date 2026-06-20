/**
 * CSV serialisation utility.
 *
 * toCsv builds an RFC-4180-compliant CSV string from an array of row objects.
 * Fields that contain a comma, double-quote, or newline character are wrapped
 * in double-quotes; embedded double-quotes are escaped by doubling them.
 */

function escapeField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Serialise rows into a CSV string.
 *
 * @param rows    Array of plain-object records; values must be strings.
 * @param columns Ordered list of column keys; defines both the header row and
 *                the column order. Missing keys in a row produce an empty cell.
 * @returns       A UTF-8 CSV string with CRLF-free line endings (`\n`).
 */
export function toCsv(rows: Record<string, string>[], columns: string[]): string {
  const header = columns.join(',')
  if (rows.length === 0) return header

  const dataRows = rows.map((row) =>
    columns.map((col) => escapeField(row[col] ?? '')).join(','),
  )

  return [header, ...dataRows].join('\n')
}
