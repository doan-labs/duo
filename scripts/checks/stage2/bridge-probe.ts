import { os } from '../../../packages/sdk/index.ts'

Object.assign(window, { probe: os, events: [] })
await os.connect()
os.commands.onCommand(async ({ type, payload }) => {
  await os.session.set(`command:${type}`, payload)
})
os.ready()
document.body.textContent = 'Connected'
