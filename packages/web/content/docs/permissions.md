# Permissions

An app can use exactly what its manifest declares. There is no runtime prompt and no settings screen: the catalog owner reviews the list, the store row shows it, and the shell enforces it.

## The table

| Name | Kind | What it grants |
| --- | --- | --- |
| `geolocation` | browser feature | `navigator.geolocation` inside the frame. The browser or OS still shows its own prompt. |
| `clipboard-read` | browser feature | Reading the clipboard. |
| `clipboard-write` | browser feature | Writing the clipboard. |
| `photos` | host service | `os.photos.list()`, `os.photos.get(id)`, `os.photos.add(blob)`: the simulator's photo library. `add` is owner-only. |

Browser features are delegated through the frame's `allow` attribute, which names every policy-controlled feature and sets each to `'none'` unless declared. Host services are bridge methods the shell gates by the manifest: an undeclared call fails with `E_DENIED` before any argument is read.

Camera and microphone are always denied. Opaque-origin capture is not available to apps yet; the shell's own Camera app is a shell component, not an installable one. Display capture, fullscreen, payment, USB, MIDI, autoplay, wake lock and XR are denied too.

## Network

```json
"network": ["https://api.example.com", "https://tiles.example.org:8443"]
```

Exact origins: scheme, host, optional port. No paths, no wildcards, no credentials. `build` writes them into the document's Content Security Policy as `connect-src` and `media-src`, so the browser refuses a connection to any origin you did not declare. Requests leave with `Origin: null` and no credentials; the API has to allow `*`.

In a development build a loopback `http://` origin is accepted so you can talk to a local server.

## What the sandbox does on its own

Independent of anything you declare, the frame runs with `sandbox="allow-scripts"` and no `allow-same-origin`. It cannot read the shell's document or storage, cannot reach another app, cannot open frames, workers or forms, and cannot load a script or style that was not in the built document. Its policy is fixed when the frame is created and hashed into the release, so the document that was reviewed is the document that runs.
