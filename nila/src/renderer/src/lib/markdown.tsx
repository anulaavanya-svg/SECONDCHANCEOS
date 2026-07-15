/**
 * A small, dependency-free Markdown renderer that returns React nodes.
 *
 * The app's Content-Security-Policy forbids remote scripts, so rather than pull
 * in a Markdown library we implement the commonly used subset: headings, bold,
 * italic, inline code, fenced code blocks, links, blockquotes, ordered and
 * unordered lists, tables, and horizontal rules. Everything is rendered as real
 * React elements (never dangerouslySetInnerHTML), so it is safe by construction.
 */
import { Fragment, type ReactNode } from 'react'

let keySeq = 0
const nextKey = (): string => `md-${keySeq++}`

export function Markdown({ text }: { text: string }): JSX.Element {
  return <div className="md">{renderBlocks(text)}</div>
}

/* ----------------------------- block level ----------------------------- */

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1]
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // skip closing fence
      nodes.push(
        <pre key={nextKey()}>
          <code data-lang={lang || undefined}>{buf.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Horizontal rule
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      nodes.push(<hr key={nextKey()} />)
      i++
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(heading[1].length, 3)
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3')
      nodes.push(<Tag key={nextKey()}>{renderInline(heading[2])}</Tag>)
      i++
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      nodes.push(<blockquote key={nextKey()}>{renderBlocks(buf.join('\n'))}</blockquote>)
      continue
    }

    // Table (header row followed by a separator row)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      nodes.push(renderTable(tableLines))
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      nodes.push(
        <ul key={nextKey()}>
          {items.map((item) => (
            <li key={nextKey()}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      nodes.push(
        <ol key={nextKey()}>
          {items.map((item) => (
            <li key={nextKey()}>{renderInline(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Paragraph: gather until blank line or a block starter.
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      para.push(lines[i])
      i++
    }
    nodes.push(<p key={nextKey()}>{renderInline(para.join(' '))}</p>)
  }

  return nodes
}

function isBlockStart(line: string): boolean {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^(\s*[-*_]){3,}\s*$/.test(line)
  )
}

function renderTable(tableLines: string[]): ReactNode {
  const parseRow = (row: string): string[] =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())

  const header = parseRow(tableLines[0])
  const bodyRows = tableLines.slice(2).map(parseRow)

  return (
    <table key={nextKey()}>
      <thead>
        <tr>
          {header.map((cell) => (
            <th key={nextKey()}>{renderInline(cell)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyRows.map((row) => (
          <tr key={nextKey()}>
            {row.map((cell) => (
              <td key={nextKey()}>{renderInline(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ----------------------------- inline level ---------------------------- */

/**
 * Inline parser. Handles (in priority order) inline code, bold, italic, links,
 * and bare URLs. Uses a single scan with a regex that matches the next inline
 * token, emitting plain text in between.
 */
function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = []
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)]+)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={nextKey()}>{text.slice(lastIndex, match.index)}</Fragment>)
    }
    const token = match[0]

    if (token.startsWith('`')) {
      nodes.push(<code key={nextKey()}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={nextKey()}>{renderInline(token.slice(2, -2))}</strong>)
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={nextKey()}>{renderInline(token.slice(1, -1))}</em>)
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        nodes.push(
          <a key={nextKey()} href={linkMatch[2]} onClick={openExternal(linkMatch[2])}>
            {renderInline(linkMatch[1])}
          </a>
        )
      } else {
        nodes.push(<Fragment key={nextKey()}>{token}</Fragment>)
      }
    } else if (/^https?:\/\//.test(token)) {
      nodes.push(
        <a key={nextKey()} href={token} onClick={openExternal(token)}>
          {token}
        </a>
      )
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={nextKey()}>{text.slice(lastIndex)}</Fragment>)
  }
  return nodes
}

/** Route link clicks through the main process so they open in the OS browser. */
function openExternal(url: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    void window.nila.app.openExternal(url).catch(() => {})
  }
}
