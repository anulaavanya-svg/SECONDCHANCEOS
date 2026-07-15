/**
 * A small, dependency-free Markdown renderer that returns React nodes.
 *
 * The app's Content-Security-Policy forbids remote scripts, so rather than pull
 * in a Markdown library we implement the commonly used subset: headings, bold,
 * italic, inline code, fenced code blocks, links, blockquotes, ordered and
 * unordered lists, tables, and horizontal rules. Everything is rendered as real
 * React elements (never dangerouslySetInnerHTML), so it is safe by construction.
 *
 * Keys are derived from each node's structural position (a path string), so
 * they are stable across re-renders for identical input. This lets React
 * reconcile efficiently while the streaming bubble grows, instead of tearing
 * down and rebuilding the whole subtree on every delta.
 */
import { Fragment, memo, type ReactNode } from 'react'

export const Markdown = memo(function Markdown({ text }: { text: string }): JSX.Element {
  return <div className="md">{renderBlocks(text, 'b')}</div>
})

/* ----------------------------- block level ----------------------------- */

function renderBlocks(text: string, path: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let n = 0
  const key = (): string => `${path}-${n++}`

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
        <pre key={key()}>
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
      nodes.push(<hr key={key()} />)
      i++
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(heading[1].length, 3)
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
      const k = key()
      nodes.push(<Tag key={k}>{renderInline(heading[2], k)}</Tag>)
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
      const k = key()
      nodes.push(<blockquote key={k}>{renderBlocks(buf.join('\n'), k)}</blockquote>)
      continue
    }

    // Table (header row followed by a separator row)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      nodes.push(renderTable(tableLines, key()))
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      const k = key()
      nodes.push(
        <ul key={k}>
          {items.map((item, idx) => (
            <li key={`${k}-${idx}`}>{renderInline(item, `${k}-${idx}`)}</li>
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
      const k = key()
      nodes.push(
        <ol key={k}>
          {items.map((item, idx) => (
            <li key={`${k}-${idx}`}>{renderInline(item, `${k}-${idx}`)}</li>
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
    const k = key()
    nodes.push(<p key={k}>{renderInline(para.join(' '), k)}</p>)
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

function renderTable(tableLines: string[], path: string): ReactNode {
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
    <div className="md-table-wrap" key={path}>
      <table>
        <thead>
          <tr>
            {header.map((cell, ci) => (
              <th key={`${path}-h-${ci}`}>{renderInline(cell, `${path}-h-${ci}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={`${path}-r-${ri}`}>
              {row.map((cell, ci) => (
                <td key={`${path}-r-${ri}-${ci}`}>{renderInline(cell, `${path}-r-${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ----------------------------- inline level ---------------------------- */

/**
 * Inline parser. Handles (in priority order) inline code, bold, italic, links,
 * and bare URLs. Uses a single scan with a regex that matches the next inline
 * token, emitting plain text in between.
 */
function renderInline(text: string, path: string): ReactNode {
  const nodes: ReactNode[] = []
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)]+)/g

  let lastIndex = 0
  let match: RegExpExecArray | null
  let seg = 0
  const key = (): string => `${path}-i${seg++}`

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key()}>{text.slice(lastIndex, match.index)}</Fragment>)
    }
    const token = match[0]
    const k = key()

    if (token.startsWith('`')) {
      nodes.push(<code key={k}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={k}>{renderInline(token.slice(2, -2), k)}</strong>)
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={k}>{renderInline(token.slice(1, -1), k)}</em>)
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch && isSafeUrl(linkMatch[2])) {
        nodes.push(
          <a key={k} href={linkMatch[2]} onClick={openExternal(linkMatch[2])}>
            {renderInline(linkMatch[1], k)}
          </a>
        )
      } else {
        nodes.push(<Fragment key={k}>{token}</Fragment>)
      }
    } else if (/^https?:\/\//.test(token)) {
      nodes.push(
        <a key={k} href={token} onClick={openExternal(token)}>
          {token}
        </a>
      )
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key()}>{text.slice(lastIndex)}</Fragment>)
  }
  return nodes
}

/** Only http(s) links may be rendered as clickable — blocks javascript:, file:, etc. */
function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/** Route link clicks through the main process so they open in the OS browser. */
function openExternal(url: string) {
  return (e: React.MouseEvent): void => {
    e.preventDefault()
    if (isSafeUrl(url)) void window.nila.app.openExternal(url).catch(() => {})
  }
}
