# Buttons and sensors

Your app can hear the phone's hardware: the volume buttons, Camera Control, the side button, the phone's pose and the Control Center switches. Every one is an event. Listen with `os.device.on`, and call what it returns to stop.

```ts
import { os } from '@doan-labs/duo-sdk'

const stop = os.device.on('volume', (e) => {
  if (e.action === 'press') move(e.button === 'up' ? -1 : 1)
})

// later
stop()
```

[Press them live](/sdk): the phone on that page is the real shell, and every readout is what it told a listening app.

No manifest entry is needed. Nothing crosses the bridge until something listens, and the shell stops sending a type once its last listener has stopped.

## Events

| Type | Payload | While you listen |
| --- | --- | --- |
| `volume` | `{ action: 'press' \| 'release', button: 'up' \| 'down' }` | The press is yours: the ringer level, the HUD and the Camera shutter stay still. |
| `camera-control` | `{ action: 'press' \| 'release' }` or `{ action: 'slide', offset }` | The press is yours: Camera does not open, shoot or zoom. `offset` is centimetres along the cap since the press, positive toward the top. |
| `side` | `{ action: 'press' \| 'release' }` | You hear it, but the phone still sleeps, wakes, opens Wallet and calls Siri. |
| `orientation` | `{ yaw, hinge }` in degrees | The first event is the current pose. `yaw` turns about the long axis, 0 facing the person, positive as the right edge swings away, from -180 up to but not including 180. `hinge` equals `os.view.angle`. |
| `switches` | `{ airplane, cell, wifi, bt, drop, hotspot, rotate, mirror, focus, torch, darkMode }` | The first event is the current state. Read-only: only the person flips them. |

## Which view hears a press

A press goes to one view: the first listener whose view is visible and active when the button goes down. On a folded phone that is the cover copy; open, the inner one. If no listening view qualifies, the press does what it always does. The view that took a press also gets its slides and its release, even if it stops listening in between, so a button never sticks down.

Two things always belong to the phone: the side button, and the side+volume chord that takes a screenshot or brings up the power-off slider. No app can stop the person locking the phone.

## Listen only while you need it

Taking volume means the person cannot change the volume while your app is up. Listen for the moment it is useful, such as a shutter or a game in progress, and stop when that ends.

```tsx
function useDevice<K extends DeviceEvent>(type: K) {
  const [last, setLast] = useState<DeviceEvents[K] | null>(null)
  useEffect(() => os.device.on(type, setLast), [type])
  return last
}

const pose = useDevice('orientation')   // { yaw, hinge } or null until the first event
```

A second listener of a state type (`orientation`, `switches`) receives the latest value right away, so every component starts from the same state.

## The side button's double-click

`os.sideButton` is separate and unchanged. A view that claims it gets the double-click instead of Wallet, which is how a payment sheet confirms:

```ts
await os.sideButton.claim()
const off = os.sideButton.onDouble(() => pay())
// when the sheet closes
off()
await os.sideButton.release()
```
