import { PlatformError } from '../../sdk/guards.ts'
import type { Photo } from '../../sdk/permissions.ts'

export const shots: string[] = []
const photos = new Map<string, { photo: Photo; url: string }>()
const listeners = new Set<() => void>()
export const subscribePhotos = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
export const photoRevision = () => shots.length
export function notifyPhotos() {
  for (const cb of listeners) cb()
}
async function listed() {
  for (const url of shots)
    if (![...photos.values()].some((p) => p.url === url)) {
      const image = new Image()
      image.src = url
      await image.decode()
      const photo = {
        id: crypto.randomUUID(),
        takenAt: Date.now(),
        width: image.naturalWidth,
        height: image.naturalHeight
      }
      photos.set(photo.id, { photo, url })
    }
  return [...photos.values()].filter((p) => shots.includes(p.url)).map((p) => p.photo)
}
export async function photoService(method: string, p: Record<string, unknown>) {
  if (method === 'photos.list') return listed()
  if (method === 'photos.get') {
    await listed()
    if (typeof p.id !== 'string' || !photos.has(p.id)) throw new PlatformError('E_ARGS')
    return (await fetch(photos.get(p.id)!.url)).blob()
  }
  if (
    !(p.blob instanceof Blob) ||
    p.blob.size > 8 * 1024 * 1024 ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(p.blob.type)
  )
    throw new PlatformError('E_ARGS')
  const url = URL.createObjectURL(p.blob)
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new PlatformError('E_ARGS', 'Invalid photo')
  }
  if (image.naturalWidth * image.naturalHeight > 40_000_000) {
    URL.revokeObjectURL(url)
    throw new PlatformError('E_ARGS', 'Photo too large')
  }
  const photo = { id: crypto.randomUUID(), takenAt: Date.now(), width: image.naturalWidth, height: image.naturalHeight }
  photos.set(photo.id, { photo, url })
  shots.unshift(url)
  notifyPhotos()
  return photo
}
