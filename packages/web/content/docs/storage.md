# Storage

Two key-value spaces, both strings only, both asynchronous, both revisioned. The frame has no `localStorage`; this is the whole persistence story.

| | `os.storage` | `os.session` |
| --- | --- | --- |
| Lifetime | Until the app is removed | While the app is open |
| Shared by | Every view, every session, in the shell's IndexedDB under the app id | Every view of this open app |
| Size | 5 MiB, 4096 keys | 64 KiB |
| Use it for | Documents, settings, anything the person would miss | Scroll position, the selected item, a draft mid-edit |

## The API

```ts
await os.storage.get('lastTab')                       // string | null
const { rev } = await os.storage.set('lastTab', 'today')   // durable when this resolves
await os.storage.del('lastTab')
const { keys, cursor } = await os.storage.keys()      // 256 per page; pass cursor for the next

const snap = await os.storage.snapshot()              // { rev, entries: [k, v][] }
const stop = os.storage.watch(snap.rev, (change) => { // { rev, k, v }; v is null for a delete
  // apply in order
})
```

Revisions are per space and increase by one per change. Take a snapshot, then watch from its `rev`: you receive every change after it, in order, from any view. A gap in `rev` means you missed one; take a new snapshot. A watch that the shell refuses calls back once with `rev: -1`.

Both views of an app see the same revisions, so the mirror stays current without any code of yours.

## React

```tsx
import { useKV } from '@doan-labs/ipduo-sdk/react'

const { value, status, error, set, del } = useKV(os.storage, 'note')
```

`status` is `hydrating` until the first read lands, then `ready`, `saving` while a write is in flight, or `error`. Edits during hydration are kept and applied after it. Writes are serialised per key, and an incoming change from the other view replaces `value`. One mirror is shared by every `useKV` on the same space, so the snapshot and watch happen once per document.

## Timeouts

A mutation that gets no acknowledgement in five seconds is retried once with the same request id, and the shell deduplicates it. If the retry also times out the promise rejects with `E_TIMEOUT`. Timing out is not proof the write failed: read the key back before writing again.

## Migrations

Keep a `schema` key. When `os.session.migration` is set on the owner, the app is starting on data written by version `from`: migrate forward, tolerate unknown keys, and finish before `os.ready()`. The shell hands migration context to the owner only, and never to a `?dev=` app.

## Removal

Removing the app deletes its storage, sessions, widget snapshots and recovery copies in one pass. A development app's data lives under `dev:<origin>:<id>` and is deleted from the DEV row in App Store; it never touches the installed app with the same id.
