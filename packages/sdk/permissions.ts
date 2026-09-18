export const PERMISSIONS = {
  geolocation: { kind: 'feature', allow: 'geolocation', label: 'Location' },
  'clipboard-read': { kind: 'feature', allow: 'clipboard-read', label: 'Read clipboard' },
  'clipboard-write': { kind: 'feature', allow: 'clipboard-write', label: 'Write clipboard' },
  photos: {
    kind: 'service',
    methods: ['photos.list', 'photos.get', 'photos.add'],
    mutating: ['photos.add'],
    label: 'Photos'
  }
} as const

export type PermissionName = keyof typeof PERMISSIONS
export type ServiceMethod = (typeof PERMISSIONS.photos.methods)[number]
export type Photo = { id: string; takenAt: number; width: number; height: number }
export const DENIED_FEATURES = [
  'camera',
  'microphone',
  'display-capture',
  'fullscreen',
  'payment',
  'usb',
  'midi',
  'autoplay',
  'screen-wake-lock',
  'xr-spatial-tracking'
] as const
export function permissionsValid(names: unknown): names is PermissionName[] {
  return (
    Array.isArray(names) &&
    new Set(names).size === names.length &&
    names.every((name) => typeof name === 'string' && Object.hasOwn(PERMISSIONS, name))
  )
}
export function frameAllow(names: readonly PermissionName[] = []): string {
  const features = Object.entries(PERMISSIONS).flatMap(([name, row]) =>
    row.kind === 'feature' ? [`${row.allow} ${names.includes(name as PermissionName) ? '*' : "'none'"}`] : []
  )
  return [...features, ...DENIED_FEATURES.map((name) => `${name} 'none'`)].join('; ')
}
export function servicePermission(method: string): PermissionName | undefined {
  return Object.entries(PERMISSIONS).find(
    ([, row]) => row.kind === 'service' && (row.methods as readonly string[]).includes(method)
  )?.[0] as PermissionName | undefined
}
export function mutatingService(method: string): boolean {
  return Object.values(PERMISSIONS).some(
    (row) => row.kind === 'service' && (row.mutating as readonly string[]).includes(method)
  )
}
