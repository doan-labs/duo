# Lifecycle

What happens between the shell creating a frame and your app's first paint, and how the connection ends.

## Connect, then render, then ready

```ts
import { os } from '@doan-labs/ipduo-sdk'

await os.connect()          // hello → welcome → ack; resolves with os.view, os.owner, os.session filled
createRoot(document.body).render(<App />)
requestAnimationFrame(() => os.ready())   // after the first frame painted
```

`connect()` posts `hello` to the shell with the protocol version, the SDK version and the single-use nonce the frame received as `window.name`, retrying every second. The shell answers `welcome` with the view, the session and a transferred `MessagePort`, or `refused` when the SDK version is incompatible, the protocol is wrong or the frame is blocked. Every later message rides the port.

Call `connect()` once, before rendering. Calling it again returns the same promise. `ready()` tells the shell the first frame is on glass so it can drop its launch cover; until then the person sees your icon.

## What `welcome` carries

| | |
| --- | --- |
| `os.view` | The display this document is on. See [Displays and the fold](displays.md). |
| `os.owner` | `{ epoch }` when this view is the designated owner of effects, otherwise `null`. |
| `os.session.arg` | The argument another app or a link opened you with, if any. `os.session.onArg` fires when it changes. |
| `os.session.migration` | `{ from }` when the owner should migrate data written by an earlier version. |
| `os.storage.limits` | The limits below. |

## Requests and errors

Every SDK method is a request over the port with an id. Requests are answered in order, and a mutation is acknowledged only after the shell's database transaction completed. A request that gets no answer in five seconds is retried once with the same id, so the shell can deduplicate; if that also times out the promise rejects with `E_TIMEOUT`. A timeout does not prove a write failed: read back before writing again.

Failures reject with `PlatformError`, whose `code` is one of:

| Code | Meaning |
| --- | --- |
| `E_ARGS` | Bad key, oversized value, too many requests in flight. |
| `E_QUOTA` | Storage or command quota exhausted. |
| `E_RATE` | Rate limit; back off. |
| `E_DENIED` | A permission the manifest does not declare. |
| `E_STALE` | An owner-only call from a view that is no longer the owner. |
| `E_TIMEOUT` | No answer after the retry. |
| `E_CLOSED`, `E_GONE` | The view was revoked or the app removed. |
| `E_PROTOCOL` | Malformed traffic; the shell closes the view. |
| `E_STORAGE` | The database failed. |

## Limits

| | |
| --- | --- |
| Key | 128 bytes, printable characters |
| Value | 256 KiB, strings only |
| Keys per app | 4096 |
| Persistent storage | 5 MiB per app |
| Session storage | 64 KiB per session |
| Command payload | 16 KiB; 32 commands waiting |
| Requests in flight | 64; 200 per second sustained, 400 burst |
| Message envelope | 300 KiB |

## Ending

The shell sends `bye` with a reason (`closed`, `uninstalled`, `updating`, `error`, `revoked`) and closes the port. Pending promises reject with `E_CLOSED`. There is no hook to run code afterwards: anything that must survive lives in storage before it happens. A frame that throws an uncaught error reports it to the shell; Escape pressed inside the frame is forwarded and takes the person home.
