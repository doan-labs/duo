# Introduction

Duo is a simulator of Apple's iPhone Duo that runs as a web page and as a desktop window. It has the phone's two displays, a hinge you can drag, a home screen, and an App Store. You can build apps for it.

A Duo app is a small web application. You write it in TypeScript and React, style it with StyleX and the kit's tokens, and the CLI compiles it into a single immutable HTML document. The shell runs that document inside a sandboxed frame, gives it two displays through the SDK, persists its data, and installs it from a catalog you host.

## The three packages

- **SDK**, `@doan-labs/duo-sdk`. The bridge between your app and the shell: displays, the fold, storage, commands, widgets and links. One client, `os`, plus `useKV` for React.
- **UI kit**, `@doan-labs/duo-uikit`. Components and design tokens that already know about the cover and inner display: `Screen`, `NavigationStack`, `List`, `Row`, `Button`, `Toggle`, `Text` and more, plus `useDisplay`.
- **CLI**, `@doan-labs/duo-cli`. `create`, `check`, `build`, `dev`, `preview` and `serve`.

Apps bundle the SDK and kit they compile against. The SDK version an app was built with is its host requirement; the kit version never gates anything.

## How an app runs

```
your source → duo build → release.json + app.html + icon
                             (script, styles and assets inline)

index.json → App Store → verified download → IndexedDB
                       → <iframe sandbox="allow-scripts">
```

The frame has an opaque origin. It cannot read the shell, another app, or `localStorage`. Everything it needs comes over a `MessagePort` the shell hands it during a nonce handshake: `hello`, `welcome`, `ack`. The SDK does that handshake in `os.connect()`.

Every display runs its own copy of your app, so while the phone folds the other display already holds a running view. Both views share storage and session through the shell, and one of them is the designated owner of effects. That is the one idea developers trip on; [Displays and the fold](displays.md) covers it.

## What to read next

- [Getting started](getting-started.md): the simulator on your machine and your app on its home screen.
- [Your first app](your-first-app.md): what the generated project does, line by line.
- [Manifest](manifest.md), [Lifecycle](lifecycle.md), [Storage](storage.md), [Permissions](permissions.md): the contract.
- [CLI](cli.md) and [Catalogs](catalogs.md): building, serving and installing.
- The [SDK reference](/sdk) and [UI kit reference](/kit) are generated from the source.
