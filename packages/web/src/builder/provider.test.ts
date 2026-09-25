import { afterEach, expect, test } from 'bun:test'
import { example } from './example'
import { completion, endpointURL, PROVIDERS } from './provider'
import { parseResponse, parseSource } from './types'

const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})
const connection = { endpoint: 'https://provider.example/v1/', model: 'test', key: 'test-only-secret' }
const messages = [{ role: 'user' as const, content: 'Make a timer' }]
function response(chunks: string[], type = 'text/event-stream') {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
        controller.close()
      }
    }),
    { headers: { 'Content-Type': type } }
  )
}
test('direct requests omit cookies, refuse redirects and keep the key out of the body', async () => {
  let calls = 0
  globalThis.fetch = (async (url, options) => {
    calls++
    expect(url).toBe('https://provider.example/v1/chat/completions')
    expect(options?.credentials).toBe('omit')
    expect(options?.redirect).toBe('error')
    expect(options?.referrerPolicy).toBe('no-referrer')
    expect(options?.body).not.toContain(connection.key)
    const body = JSON.parse(String(options?.body))
    expect(body.model).toBe('test')
    expect(body.stream).toBe(true)
    expect(new Headers(options?.headers).get('Authorization')).toBe(`Bearer ${connection.key}`)
    return response([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\r',
      '\n\r\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'
    ])
  }) as typeof fetch
  expect(await completion(connection, messages, new AbortController().signal)).toBe('Hi')
  expect(calls).toBe(1)
})
test('accepts a non-streaming compatible provider', async () => {
  globalThis.fetch = (async () =>
    response(['{"choices":[{"message":{"content":"OK"},"finish_reason":"stop"}]}'], 'application/json')) as typeof fetch
  expect(await completion(connection, messages, new AbortController().signal)).toBe('OK')
})
test('truncation and disconnected streams never become revisions', async () => {
  globalThis.fetch = (async () =>
    response(['data: {"choices":[{"delta":{"content":"partial"},"finish_reason":"length"}]}\n\n'])) as typeof fetch
  await expect(completion(connection, messages, new AbortController().signal)).rejects.toThrow('truncated')
  globalThis.fetch = (async () => response(['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'])) as typeof fetch
  await expect(completion(connection, messages, new AbortController().signal)).rejects.toThrow(
    'before a complete response'
  )
})
test('refuses provider responses over the 2 MB size limit', async () => {
  globalThis.fetch = (async () =>
    response([
      `data: {"choices":[{"delta":{"content":"${'x'.repeat(2_000_001)}"}}]}\n\n`,
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'
    ])) as typeof fetch
  await expect(completion(connection, messages, new AbortController().signal)).rejects.toThrow('size limit')
})
test('does not display provider error bodies containing credentials', async () => {
  globalThis.fetch = (async () => new Response(connection.key, { status: 401 })) as typeof fetch
  await expect(completion(connection, messages, new AbortController().signal)).rejects.toThrow('API key was rejected')
  globalThis.fetch = (async () => new Response(connection.key, { status: 429 })) as typeof fetch
  await expect(completion(connection, messages, new AbortController().signal)).rejects.toThrow(
    'Provider rate limit reached; retry later'
  )
})
test('OpenAI with gpt-6-luna is the default provider preset', () => {
  expect(PROVIDERS[0]).toMatchObject({ id: 'openai', name: 'OpenAI', model: 'gpt-6-luna' })
  expect(PROVIDERS.map((p) => p.id)).toEqual(['openai', 'openrouter', 'google', 'groq'])
})
test('endpoint credentials, fragments, queries and insecure transport are refused', () => {
  for (const url of [
    'http://example.com/v1',
    'https://user:pass@example.com/v1',
    'https://example.com/v1?k=secret',
    'https://example.com/v1#secret'
  ])
    expect(() => endpointURL(url)).toThrow()
})
test('source schema rejects traversal, executable HTML and oversized projects', () => {
  expect(parseResponse(`\`\`\`json\n${JSON.stringify(example)}\n\`\`\``).name).toBe('Focus')
  for (const files of [
    { '../app.tsx': '' },
    { 'app.tsx': '', 'escape.html': '<script />' },
    { 'app.tsx': 'x'.repeat(180_001) }
  ])
    expect(() => parseSource({ ...example, files })).toThrow()
})
