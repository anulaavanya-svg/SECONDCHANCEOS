import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { ASSISTANT_PERSONAS, AssistantPersona } from '@/lib/assistant-prompts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'
const MAX_MESSAGES = 30
const MAX_MESSAGE_LENGTH = 4000

// Server-side Anthropic proxy. The system prompt is selected server-side by
// persona + role — never client-controlled — and the API key never leaves
// the server.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()

    const persona = body.persona as AssistantPersona
    if (persona !== 'manager' && persona !== 'employee') {
      return NextResponse.json({ error: 'persona must be "manager" or "employee"' }, { status: 400 })
    }
    // Role gate: the manager coach is for managers/admins only
    if (persona === 'manager' && !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const messages: Anthropic.MessageParam[] = body.messages
      .slice(-MAX_MESSAGES)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(m.content ?? '').slice(0, MAX_MESSAGE_LENGTH),
      }))
      .filter((m: Anthropic.MessageParam) => m.content !== '')
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from the user' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            'The assistant is not configured yet. Ask your administrator to set ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      )
    }

    const anthropic = new Anthropic()

    // Stream the response as plain text chunks
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: ASSISTANT_PERSONAS[persona],
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        stream.on('text', (delta) => controller.enqueue(encoder.encode(delta)))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => {
          console.error('Assistant stream error:', err)
          controller.error(err)
        })
      },
      cancel() {
        stream.abort()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/assistant failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
