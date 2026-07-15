/**
 * Web research using Claude's server-side web_search tool.
 *
 * Claude performs the searches and reads pages server-side; we collect the
 * synthesized answer text and de-duplicate the cited sources for the UI. No
 * separate search-engine API key is required.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL, type ResearchRequest, type ResearchResult, type ResearchSource } from '@shared/types'
import type { AnthropicClientProvider } from './anthropic-client'
import { createLogger } from './logger'

const log = createLogger('research')

const RESEARCH_SYSTEM =
  'You are a meticulous research assistant. Search the web, then answer the ' +
  'question accurately and concisely. Cite the specific sources you used. If ' +
  'the evidence is thin or conflicting, say so.'

export class ResearchService {
  constructor(private readonly clients: AnthropicClientProvider) {}

  async run(req: ResearchRequest): Promise<ResearchResult> {
    const client = this.clients.get()
    const maxUses = Math.min(Math.max(req.maxSources ?? 5, 1), 10)

    log.info('research', req.query)
    const response = await client.messages.create({
      model: req.model ?? DEFAULT_MODEL,
      max_tokens: 2048,
      system: RESEARCH_SYSTEM,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: maxUses
        } as unknown as Anthropic.Tool
      ],
      messages: [{ role: 'user', content: req.query }]
    })

    const answer = collectText(response)
    const sources = collectSources(response)
    return { query: req.query, answer, sources }
  }
}

function collectText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

/**
 * Sources come from two places: `web_search_tool_result` blocks (the raw hits)
 * and citations attached to text blocks (what Claude actually used). We merge
 * and de-duplicate by URL.
 */
function collectSources(response: Anthropic.Message): ResearchSource[] {
  const byUrl = new Map<string, ResearchSource>()

  for (const block of response.content) {
    // Citations embedded in text blocks.
    if (block.type === 'text') {
      const citations = (block as { citations?: unknown[] }).citations
      if (Array.isArray(citations)) {
        for (const c of citations) {
          const cite = c as { url?: string; title?: string; cited_text?: string }
          if (cite.url && !byUrl.has(cite.url)) {
            byUrl.set(cite.url, {
              url: cite.url,
              title: cite.title || cite.url,
              snippet: cite.cited_text || ''
            })
          }
        }
      }
    }

    // Raw search-result blocks.
    const anyBlock = block as { type: string; content?: unknown }
    if (anyBlock.type === 'web_search_tool_result' && Array.isArray(anyBlock.content)) {
      for (const item of anyBlock.content) {
        const hit = item as { url?: string; title?: string; page_age?: string }
        if (hit.url && !byUrl.has(hit.url)) {
          byUrl.set(hit.url, {
            url: hit.url,
            title: hit.title || hit.url,
            snippet: hit.page_age ? `Published ${hit.page_age}` : ''
          })
        }
      }
    }
  }

  return [...byUrl.values()]
}
