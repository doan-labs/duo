import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'

export type Connection = { endpoint: string; model: string; key: string }
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type Provider = { id: string; name: string; endpoint: string; model: string; keys: string }
/** OpenAI-compatible endpoints known to allow browser requests. Anything else is a custom endpoint. */
export const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-6-luna',
    keys: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
    keys: 'https://openrouter.ai/keys'
  },
  {
    id: 'google',
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-pro',
    keys: 'https://aistudio.google.com/apikey'
  },
  {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-120b',
    keys: 'https://console.groq.com/keys'
  }
]
/** Model IDs the endpoint lists; OpenRouter answers without a key, the others need one. */
export async function models(connection: Connection, signal: AbortSignal): Promise<string[]> {
  const url = endpointURL(connection.endpoint).replace(/chat\/completions$/, 'models')
  const key = connection.key.trim()
  const response = await fetch(url, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal
  })
  if (!response.ok) throw new Error(`Model list unavailable (${response.status})`)
  const data = await response.json()
  const list: unknown[] = Array.isArray(data?.data) ? data.data : []
  return list
    .map((m) =>
      m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string' ? (m as { id: string }).id : ''
    )
    .filter(Boolean)
    .map((id) => id.replace(/^models\//, ''))
    .sort()
}
/** The sanitized base URL the AI SDK provider appends `/chat/completions` to. */
function validatedBaseURL(base: string) {
  const url = new URL(base.trim())
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('Use an HTTPS API base URL without credentials, query parameters or a fragment')
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}
export function endpointURL(base: string) {
  return `${validatedBaseURL(base)}/chat/completions`
}
const SIZE_LIMIT = 'Provider response exceeds the size limit'
const INVALID_RESPONSE = 'Provider returned an invalid response'
/** Counts raw response bytes and fails the stream past the 2 MB cap. */
function limitedBody(body: ReadableStream<Uint8Array>) {
  let received = 0
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength
        if (received > 2_000_000) throw new Error(SIZE_LIMIT)
        controller.enqueue(chunk)
      }
    })
  )
}
/**
 * The only transport generation requests use: the global fetch current at request time,
 * with cookies omitted, redirects refused, no referrer and a hard 2 MB cap counted across
 * the raw response body. A successful non-streaming JSON reply is decoded once, only to
 * normalize it into a single SSE chunk for the AI SDK; provider bodies are never logged
 * or surfaced.
 */
async function safeLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(input, {
    ...init,
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer'
  })
  const details = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  }
  if (!response.body) return response
  if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/json'))
    return new Response(limitedBody(response.body), details)
  const text = await new Response(limitedBody(response.body)).text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(INVALID_RESPONSE)
  }
  const choices = (parsed as { choices?: unknown } | null)?.choices
  const choice = Array.isArray(choices) ? choices[0] : undefined
  const content = (choice as { message?: { content?: unknown } } | undefined)?.message?.content
  const finish = (choice as { finish_reason?: unknown } | undefined)?.finish_reason
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(choices) ||
    !choice ||
    typeof choice !== 'object' ||
    typeof content !== 'string' ||
    !(typeof finish === 'string' || finish === null)
  )
    throw new Error(INVALID_RESPONSE)
  const source = parsed as Record<string, unknown>
  const chunk: Record<string, unknown> = { choices: [{ delta: { content }, finish_reason: finish }] }
  for (const key of ['id', 'created', 'model', 'usage']) if (key in source) chunk[key] = source[key]
  const headers = new Headers(response.headers)
  headers.set('Content-Type', 'text/event-stream')
  return new Response(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`), {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
export async function completion(
  connection: Connection,
  messages: ChatMessage[],
  signal: AbortSignal,
  progress: (characters: number) => void = () => {},
  test = false
) {
  const base = validatedBaseURL(connection.endpoint)
  if (!connection.key.trim()) throw new Error('Enter your API key in Connection')
  if (!connection.model.trim()) throw new Error('Enter a model ID in Connection')
  const timeout = AbortSignal.timeout(180_000)
  const combined = AbortSignal.any([signal, timeout])
  try {
    // AI SDK 7 keeps system text out of `messages`; the wire request is unchanged.
    const instructions = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')
    const result = streamText({
      model: createOpenAICompatible({
        name: 'duo-builder',
        baseURL: base,
        apiKey: connection.key.trim(),
        fetch: safeLimitedFetch
      }).chatModel(connection.model.trim()),
      instructions: instructions || undefined,
      messages: messages.filter((message) => message.role !== 'system'),
      maxOutputTokens: test ? 16 : 12000,
      maxRetries: 0,
      streamRetries: 0,
      abortSignal: combined,
      onError: () => {}
    })
    let output = ''
    let complete = false
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        output += part.text
        progress(output.length)
      } else if (part.type === 'finish') {
        if (part.finishReason === 'length') throw new Error('Response was truncated. Ask for a smaller app.')
        if (part.finishReason === 'content-filter') throw new Error('Provider declined this request')
        if (part.finishReason === 'error') throw new Error('Provider reported a generation error')
        complete = part.finishReason === 'stop'
      } else if (part.type === 'error') {
        throw part.error
      } else if (part.type === 'abort') {
        throw new DOMException('Stopped', 'AbortError')
      }
    }
    if (!complete || !output.trim()) throw new Error('Provider stream ended before a complete response')
    return output
  } catch (error) {
    if (signal.aborted) throw new Error('Stopped')
    if (timeout.aborted) throw new Error('Provider timed out after 3 minutes')
    // The SDK reports failures as error stream parts, often wrapped; walk the chain for
    // our own safe messages and for an HTTP status, never surfacing provider text.
    const safe = [
      SIZE_LIMIT,
      INVALID_RESPONSE,
      'Response was truncated. Ask for a smaller app.',
      'Provider declined this request',
      'Provider reported a generation error',
      'Provider stream ended before a complete response'
    ]
    let status: number | undefined
    let incomplete = false
    const seen = new Set<unknown>()
    for (let current: unknown = error; current && !seen.has(current); ) {
      seen.add(current)
      if (current instanceof Error && safe.includes(current.message)) throw current
      if (current instanceof Error && current.message.includes('finish reason')) incomplete = true
      if (typeof current !== 'object') break
      const code = (current as { statusCode?: unknown }).statusCode
      if (typeof code === 'number' && status === undefined) status = code
      current = (current as { cause?: unknown }).cause
    }
    if (incomplete) throw new Error('Provider stream ended before a complete response')
    if (status !== undefined) {
      const reason: Record<number, string> = {
        401: 'API key was rejected',
        403: 'Access denied by the provider',
        402: 'Provider credits are exhausted',
        429: 'Provider rate limit reached; retry later'
      }
      throw new Error(reason[status] ?? `Provider request failed (${status})`)
    }
    throw new Error('Cannot reach this endpoint. Check the URL, connection and provider browser CORS support.')
  }
}
