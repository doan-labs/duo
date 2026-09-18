# Displays and the fold

Duo has a 387 point cover and a 790 point inner display, both 850 tall. The inner display can hold one app full width or two side by side. Your app runs on whichever is lit, and while the phone folds the other display already runs a copy, so the handover has no remount and no flash.

## The view

```ts
os.view          // { display, placement, width, height, visible, active, focused, angle }
os.onView(cb)    // one event per frame at most, only on change

// React
const view = useDisplay()   // from @doan-labs/ipduo-uikit
```

| Field | Values | Use it for |
| --- | --- | --- |
| `display` | `cover`, `inner` | Behaviour that differs per glass, such as a pocket layout. |
| `placement` | `full`, `left`, `right` | Which half of the inner display a split view occupies. |
| `width`, `height` | points | Layout. A split half is as narrow as the cover, so lay out by the box, not by `display`. |
| `angle` | 0 to 180 | The hinge, live. 0 is closed, 180 flat. |
| `visible` | | Whether this view is on glass right now. |
| `active` | | Whether this view is the one the person is using. |
| `focused` | | Whether it has keyboard focus. |

## Design for the cover first

A layout that reads at 387 points has room to breathe unfolded: a list becomes a list beside its detail, a toolbar spreads out, a chart gets its axis labels back. The reverse never works. Never hide a feature on the cover; the person may never unfold the phone for it.

The kit's components collapse themselves at cover width. Yours should too.

## Your app runs twice

Each display is its own document with its own React tree. Module state is not shared. What both copies must agree on lives in the shell:

- `os.storage`: persistent, private to the app id, survives everything.
- `os.session`: ephemeral, shared by every view of this open app, gone when the app closes.

Both are revisioned key-value spaces; see [Storage](storage.md).

## One owner

The shell names one view the **owner**: the first to connect, sticky until that view closes, identified by an epoch.

```ts
os.owner                       // { epoch } or null
os.onOwner(cb)                 // handover when the owner closes

os.commands.send('refresh', '')          // any view; resolves when the owner acknowledged
os.commands.onCommand(async (c) => …)    // runs in the owner only
os.widget.set('small', { lines: [{ text: 'Tide 1.2 m', role: 'value' }] })   // owner only
```

The mirror draws everything and starts nothing: no sound, no network request, no timer of its own. Intent that must happen once travels as a command; the owner runs it and acknowledges, and the sender's promise resolves. A command is retried until acknowledged and deduplicated by id, so an owner handover in the middle does not lose or double it. Owner-only calls from a view that lost ownership fail with `E_STALE`.

Test it: open your app, fold the phone all the way, unfold it. The same content, the same scroll position, once.

## Widgets

Declare `widgets` in the manifest and publish a snapshot from the owner. The shell draws it and shows its age; no app code runs on the home screen.

```ts
os.widget.set('medium', {
  lines: [
    { text: 'Next high tide', role: 'label' },
    { text: '14:32', role: 'value' },
    { text: 'in 2 h 10 min', role: 'caption' }
  ],
  tint: 'glass',
  arg: 'tide=next'     // handed to os.session.arg when the widget opens the app
})
```

Up to eight lines of 64 characters. `arg` is at most 256 characters.

## Links between apps

```ts
os.open('labs.doan.ipduo.maps', 'q=tides')   // by id, with an optional argument
os.home()
```

The target receives the argument in `os.session.arg`. The shell owns the scheme; apps cannot register their own.
