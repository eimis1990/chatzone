export interface BlogFrontmatter {
  title: string
  description: string
  date: string
  updated?: string
  topic: string
  author: string
  authorRole?: string
  authorImage?: string
  authorLinkedin?: string
  image?: string
  related?: string
}

/** Parse the deliberately small `key: value` frontmatter format used by Loqara posts. */
export function parseBlogFrontmatter(raw: string): {
  data: Record<string, string>
  body: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const rawValue = line.slice(separator + 1).trim()
    let value = rawValue
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      try {
        value = JSON.parse(rawValue) as string
      } catch {
        value = rawValue.slice(1, -1)
      }
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
      value = rawValue.slice(1, -1)
    }
    if (key) data[key] = value
  }

  return { data, body: match[2] }
}

function quote(value: string): string {
  // The parser is line-based, so an embedded newline would inject frontmatter keys.
  return `"${value.replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Serialize a studio draft into the exact file shape consumed by the public blog. */
export function serializeBlogPost(frontmatter: BlogFrontmatter, body: string): string {
  const lines = [
    '---',
    `title: ${quote(frontmatter.title)}`,
    `description: ${quote(frontmatter.description)}`,
    `date: ${frontmatter.date}`,
    ...(frontmatter.updated ? [`updated: ${frontmatter.updated}`] : []),
    `topic: ${frontmatter.topic}`,
    `author: ${frontmatter.author}`,
    ...(frontmatter.authorRole ? [`authorRole: ${quote(frontmatter.authorRole)}`] : []),
    ...(frontmatter.authorImage ? [`authorImage: ${frontmatter.authorImage}`] : []),
    ...(frontmatter.authorLinkedin ? [`authorLinkedin: ${frontmatter.authorLinkedin}`] : []),
    ...(frontmatter.image ? [`image: ${frontmatter.image}`] : []),
    ...(frontmatter.related ? [`related: ${frontmatter.related}`] : []),
    '---',
    '',
    body.trim(),
    '',
  ]

  return lines.join('\n')
}
