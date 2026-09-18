import { os } from '../../../packages/sdk/index.ts'

await os.connect()
await os.storage.set('trial-only', 'kept aside on restore')
window.dispatchEvent(new ErrorEvent('error', { message: 'Intentional pre-ready failure' }))
