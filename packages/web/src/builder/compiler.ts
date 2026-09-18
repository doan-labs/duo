import type { PreviewBundle } from '../../../sdk/builder-preview'
import type { Source } from './types'

export function compile(source: Source, signal: AbortSignal): Promise<PreviewBundle> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./compiler-worker.ts', import.meta.url), { type: 'module' })
    const finish = (error?: Error, bundle?: PreviewBundle) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      worker.terminate()
      if (error) reject(error)
      else resolve(bundle!)
    }
    const abort = () => finish(new DOMException('Stopped', 'AbortError'))
    const timer = setTimeout(() => finish(new Error('Compilation exceeded 45 seconds')), 45_000)
    signal.addEventListener('abort', abort, { once: true })
    worker.onerror = () => finish(new Error('Compiler could not start. Reload the page.'))
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : undefined, data.bundle)
    if (signal.aborted) abort()
    else worker.postMessage(source)
  })
}
