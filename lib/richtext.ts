export function isLikelyHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function toEditorHtml(value: string): string {
  if (!value) return ''
  if (isLikelyHtml(value)) return value
  return escapeHtml(value).replaceAll('\n', '<br>')
}

export function stripHtmlToText(value: string): string {
  if (!value) return ''
  const withLineBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
  const stripped = withLineBreaks.replace(/<[^>]*>/g, '')
  return decodeBasicEntities(stripped).replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n')
}

export function normalizeDescriptionForSave(value: string): string | null {
  const html = (value ?? '').trim()
  if (!html) return null
  const text = stripHtmlToText(html).trim()
  return text ? html : null
}
