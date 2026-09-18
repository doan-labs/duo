// What the UI kit pages count and list: the generated API filtered to the kit,
// and which of its components have a live demo in src/kit-demos/.
import type { ApiEntry } from '../api-types'
import { api } from '../generated/api'
import { hasDemo } from '../kit-preview'

export const kit: ApiEntry[] = api.filter((e) => e.pkg === '@doan-labs/duo-uikit')

const of = (kind: ApiEntry['kind']) => kit.filter((e) => e.kind === kind)

/** Everything with a demo file in src/kit-demos/, in export order. */
export const live = kit.filter((e) => hasDemo(e.name))

export const counts = {
  components: of('component').length,
  hooks: of('hook').length,
  helpers: of('type').length + of('function').length + of('value').length,
  live: live.length
}

/** First paragraph of an export's TSDoc on one line: the summary the cards show. */
export const summary = (e: ApiEntry) => e.doc.split(/\n\s*\n/)[0]?.replace(/\n+/g, ' ') ?? ''
