import { marked } from 'marked'

export interface RenderedHeading {
  id: string
  text: string
  level: number
}

export interface RenderedFaqItem {
  question: string
  answer: string
}

/** URL-safe slug for a heading anchor (unicode letters/numbers kept). */
export function slugifyBlogHeading(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function tableLabel(inner: string, index: number): string {
  const text = inner.replace(/<[^>]+>/g, '').trim() || (index === 0 ? 'Item' : `Column ${index + 1}`)
  return text.replace(/"/g, '&quot;')
}

function enhanceTables(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (_table, inner: string) => {
    const headerRow = inner.match(/<thead>[\s\S]*?<tr>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/)
    const headers = headerRow
      ? [...headerRow[1].matchAll(/<th>([\s\S]*?)<\/th>/g)].map((match, index) => tableLabel(match[1], index))
      : []
    const columnCount = headers.length
    const layout = columnCount >= 4 ? 'wide' : 'compact'
    const labelled = headers.length
      ? inner.replace(/<tbody>([\s\S]*?)<\/tbody>/, (_body, rows: string) => {
          const labelledRows = rows.replace(/<tr>([\s\S]*?)<\/tr>/g, (_row, cells: string) => {
            let column = 0
            return `<tr>${cells.replace(/<td>/g, () => {
              const label = headers[column] ?? `Column ${column + 1}`
              column += 1
              return `<td data-label="${label}">`
            })}</tr>`
          })
          return `<tbody>${labelledRows}</tbody>`
        })
      : inner

    return `<div class="table-wrap table-wrap--${layout}" data-columns="${columnCount}"><table>${labelled}</table></div>`
  })
}

/** Render Markdown exactly as the public article route does. Safe only for trusted owner-authored content. */
export function renderBlogMarkdown(body: string): {
  html: string
  headings: RenderedHeading[]
} {
  let html = marked.parse(body, { async: false }) as string
  const headings: RenderedHeading[] = []
  const seen = new Map<string, number>()

  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, depth: string, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, '').trim()
    let id = slugifyBlogHeading(label) || 'section'
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count) id = `${id}-${count}`
    if (depth === '2') headings.push({ id, text: label, level: 2 })
    return `<h${depth} id="${id}">${inner}</h${depth}>`
  })

  return { html: enhanceTables(html), headings }
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractBlogFaq(body: string): RenderedFaqItem[] {
  const tokens = marked.lexer(body)
  const faqs: RenderedFaqItem[] = []
  let inFaq = false
  let current: { question: string; answers: string[] } | null = null
  const flush = () => {
    if (current?.question && current.answers.length) {
      faqs.push({ question: current.question, answer: current.answers.join(' ').trim() })
    }
    current = null
  }

  for (const token of tokens) {
    if (token.type === 'heading') {
      const depth = (token as { depth: number }).depth
      const text = (token as { text: string }).text
      if (depth === 2) {
        flush()
        inFaq = /frequently asked questions|^faqs?$/i.test(text.trim())
        continue
      }
      if (inFaq && depth === 3) {
        flush()
        current = { question: stripInlineMarkdown(text), answers: [] }
        continue
      }
    }
    if (!inFaq || !current) continue
    if (token.type === 'paragraph' || token.type === 'text') {
      current.answers.push(stripInlineMarkdown((token as { text: string }).text))
    } else if (token.type === 'list') {
      const items = ((token as { items?: { text: string }[] }).items ?? [])
        .map((item) => stripInlineMarkdown(item.text))
        .join('. ')
      if (items) current.answers.push(items)
    }
  }
  flush()
  return faqs
}
