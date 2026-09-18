import {
  BUILDER_CHANNEL,
  type PreviewBundle,
  type PreviewReply,
  type PreviewRequest
} from '../../../sdk/builder-preview'

export class PreviewClient {
  token: string
  sequence = 0
  private pending = new Map<
    number,
    { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >()
  private listener = (event: MessageEvent<PreviewReply>) => {
    if (
      event.source !== this.frame.contentWindow ||
      event.origin !== this.origin ||
      event.data?.channel !== BUILDER_CHANNEL ||
      event.data.token !== this.token
    )
      return
    const job = this.pending.get(event.data.sequence)
    if (!job) return
    clearTimeout(job.timer)
    this.pending.delete(event.data.sequence)
    if (event.data.status === 'ready' || event.data.status === 'connected') job.resolve()
    else job.reject(new Error(event.data.message ?? 'Preview failed'))
  }
  constructor(
    private frame: HTMLIFrameElement,
    private origin: string,
    token: string
  ) {
    this.token = token
    window.addEventListener('message', this.listener)
  }
  private send(message: Partial<PreviewRequest> & { sequence: number }) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(message.sequence)
        reject(new Error('Simulator did not respond. Reload the workspace.'))
      }, 40_000)
      this.pending.set(message.sequence, { resolve, reject, timer })
      this.frame.contentWindow?.postMessage({ ...message, token: this.token, channel: BUILDER_CHANNEL }, this.origin)
    })
  }
  connect() {
    return this.send({ sequence: 0 })
  }
  apply(project: string, revision: string, bundle: PreviewBundle, restore = false) {
    return this.send({ sequence: ++this.sequence, project, revision, bundle, restore })
  }
  dispose() {
    window.removeEventListener('message', this.listener)
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Workspace closed'))
    }
    this.pending.clear()
  }
}
