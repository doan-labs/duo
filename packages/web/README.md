# Web

The developer site at `packages/web`: TanStack Start on Vite, StyleX through
`vite-stylex.ts`, every route prerendered into `dist/client`. It renders the
repository's Markdown, generates the SDK and UI kit references from TSDoc, and
embeds the real simulator. Motion is `motion`, scrolling is Lenis; both step
aside under reduced motion.

```sh
bun run dev      # http://localhost:3001, embed expects the root dev server on 3000
bun run build    # api → shell copy → prerender
bun run check    # headless Chrome over every route at three widths
```

Design, status and build record: [docs/platform/web.md](../../docs/platform/web.md).
