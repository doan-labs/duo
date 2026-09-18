import { launchFrame } from '../../../packages/shell/runtime/bridge.ts'
import { store } from '../../../packages/shell/runtime/catalog.ts'
import * as db from '../../../packages/shell/runtime/database.ts'
import * as development from '../../../packages/shell/runtime/development.ts'
import * as lifecycle from '../../../packages/shell/runtime/lifecycle.ts'
import { session } from '../../../packages/shell/runtime/sessions.ts'
import * as storage from '../../../packages/shell/runtime/storage.ts'

db.listenDatabase()
lifecycle.startLifecycle()
const frames: ReturnType<typeof launchFrame>[] = []
Object.assign(window, {
  host: {
    store,
    db,
    development,
    lifecycle,
    storage,
    frames,
    async launch(id: string) {
      const app = await session(id)
      const container = document.createElement('div')
      container.style.cssText = 'width:380px;height:300px;display:inline-block'
      document.body.append(container)
      const frame = launchFrame(
        app,
        container,
        {
          display: frames.length ? 'cover' : 'inner',
          placement: 'full',
          width: 380,
          height: 300,
          visible: true,
          active: true,
          focused: false,
          angle: 180
        },
        {
          state: (state, error) => {
            container.dataset.state = state
            if (error) container.dataset.error = error
          },
          home: () => {
            for (const frame of frames) frame.close()
          },
          open: () => {}
        },
        development.development.get(id)?.src
      )
      frames.push(frame)
      return { id: frame.view.id, session: app.id, epoch: app.epoch }
    }
  }
})
