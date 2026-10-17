/**
 * Caracas, Venezuela (UTC-4) Date & Time Formatting Utilities
 */

export function formatCaracasDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    // Format in America/Caracas timezone (UTC-4)
    const formatter = new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })

    return formatter.format(date)
  } catch {
    return isoString
  }
}

export function formatCaracasDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    const formatter = new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    return formatter.format(date)
  } catch {
    return isoString
  }
}
