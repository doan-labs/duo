export const previewEvents = new EventTarget()
export function previewState(id: string, hash: string, state: string, message?: string) {
  previewEvents.dispatchEvent(new CustomEvent('state', { detail: { id, hash, state, message } }))
}
