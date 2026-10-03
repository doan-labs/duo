// The document model: a rooted tree of positioned nodes. `parent` is the only
// stored reference - children, edges and subtree queries are all derived, so a
// corrupt file can only break parenting, which cleanDoc repairs.

export type View = { x: number; y: number; zoom: number; framed?: boolean }
export type MindNode = {
  id: string
  text: string
  x: number
  y: number
  parent: string | null
  /** Index into the palette resolved in styles.ts. */
  color: number
}
export type MindDoc = {
  id: string
  name: string
  root: string
  nodes: Record<string, MindNode>
  view: View
  /** Last-writer-wins clock for picking the newest map in a library. */
  updated: number
}
export type Library = { maps: Record<string, MindDoc> }
export type Mirror = { by: string; sel: string | null; doc: MindDoc }

export const PALETTE_LEN = 6
export const ZOOM_MIN = 0.35
export const ZOOM_MAX = 2.4
export const WORLD_LIMIT = 6000
const TEXT_LIMIT = 240

const spawn = () => crypto.randomUUID().slice(0, 8)
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function cleanView(v: unknown): View {
  const view = record(v) ? v : {}
  return {
    x: clamp(num(view.x, 0), -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(num(view.y, 0), -WORLD_LIMIT, WORLD_LIMIT),
    zoom: clamp(num(view.zoom, 1), ZOOM_MIN, ZOOM_MAX),
    ...(view.framed === false ? { framed: false } : {})
  }
}

function cleanNode(id: string, v: unknown, index: number): MindNode {
  const n = record(v) ? v : {}
  return {
    id,
    text: (typeof n.text === 'string' ? n.text : 'Idea').slice(0, TEXT_LIMIT),
    x: clamp(num(n.x, (index % 5) * 220 - 440), -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(num(n.y, Math.floor(index / 5) * 120 - 240), -WORLD_LIMIT, WORLD_LIMIT),
    parent: typeof n.parent === 'string' ? n.parent : null,
    color: Math.floor(clamp(num(n.color, 0), 0, PALETTE_LEN - 1))
  }
}

/**
 * Validates a stored or mirrored document: unknown shapes get defaults, dangling
 * parents reattach to the root, cycles break the same way, and a second root is
 * adopted under the real one. Returns null only when nothing can be salvaged.
 */
export function cleanDoc(v: unknown): MindDoc | null {
  if (!record(v)) return null
  const rawNodes = record(v.nodes) ? v.nodes : {}
  const entries = Object.keys(rawNodes)
    .filter((key) => /^[\w-]+$/.test(key))
    .map((key, index) => [key, cleanNode(key, rawNodes[key], index)] as const)
  if (!entries.length) return null
  const nodes: Record<string, MindNode> = {}
  for (const [key, node] of entries) nodes[key] = node
  // The declared root must exist and hold no parent; missing or invalid roots
  // fall back to the first node that claims none, then to the first node.
  const rootId =
    typeof v.root === 'string' && nodes[v.root]
      ? v.root
      : (entries.find(([, n]) => n.parent === null)?.[0] ?? entries[0]![0])
  nodes[rootId]!.parent = null
  // Walk every node to the root; a break or a loop lands the node on the root.
  for (const node of Object.values(nodes)) {
    if (node.id === rootId) continue
    const seen = new Set<string>([node.id])
    let cursor = node.parent
    while (cursor !== null) {
      const up = nodes[cursor]
      if (!up || seen.has(up.id)) {
        cursor = null
        node.parent = rootId
        break
      }
      if (up.id === rootId) break
      seen.add(up.id)
      cursor = up.parent
    }
    if (node.parent === null || !nodes[node.parent]) node.parent = rootId
    if (node.parent === node.id) node.parent = rootId
  }
  // The root id that won may have left a second claimed root detached; anything
  // still parentless and not the root is a detached island - adopt it.
  for (const node of Object.values(nodes)) if (node.id !== rootId && node.parent === null) node.parent = rootId
  const name = typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 60) : 'Untitled map'
  return {
    id: typeof v.id === 'string' && v.id ? v.id : spawn(),
    name,
    root: rootId,
    nodes,
    view: cleanView(v.view),
    updated: num(v.updated, 0)
  }
}

export function parseLibrary(raw: string | null): Library {
  if (!raw) return { maps: {} }
  try {
    const parsed: unknown = JSON.parse(raw)
    const maps: Record<string, MindDoc> = {}
    if (record(parsed) && record(parsed.maps)) {
      for (const [id, value] of Object.entries(parsed.maps)) {
        const doc = cleanDoc(value)
        if (doc) maps[id] = doc
      }
    }
    return { maps }
  } catch {
    return { maps: {} }
  }
}

export function serializeLibrary(lib: Library) {
  return JSON.stringify(lib)
}

export function parseMirror(raw: string | null): Mirror | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || typeof parsed.by !== 'string') return null
    const doc = cleanDoc(parsed.doc)
    if (!doc) return null
    const sel = typeof parsed.sel === 'string' && doc.nodes[parsed.sel] ? parsed.sel : null
    return { by: parsed.by, sel, doc }
  } catch {
    return null
  }
}

export function serializeMirror(by: string, doc: MindDoc, sel: string | null) {
  return JSON.stringify({ by, sel, doc } satisfies Mirror)
}

export function withDoc(lib: Library, doc: MindDoc): Library {
  return { maps: { ...lib.maps, [doc.id]: doc } }
}

export function withoutDoc(lib: Library, id: string): Library {
  const maps = { ...lib.maps }
  delete maps[id]
  return { maps }
}

/** The most recently edited map, or null on a fresh install. */
export function latestDoc(lib: Library): MindDoc | null {
  return Object.values(lib.maps).reduce<MindDoc | null>(
    (best, doc) => (doc.updated > (best?.updated ?? -1) ? doc : best),
    null
  )
}

export function childrenOf(doc: MindDoc, id: string): MindNode[] {
  return Object.values(doc.nodes).filter((node) => node.parent === id)
}

function node(text: string, x: number, y: number, parent: string | null, color: number): MindNode {
  return { id: spawn(), text, x, y, parent, color }
}

const touch = (doc: MindDoc): MindDoc => ({ ...doc, updated: Date.now() })

export function newDoc(name: string): MindDoc {
  const root = node('Central idea', 0, 0, null, 0)
  const right = node('First branch', 260, -60, root.id, 1)
  const left = node('Another branch', -260, 80, root.id, 2)
  return {
    id: spawn(),
    name,
    root: root.id,
    nodes: { [root.id]: root, [right.id]: right, [left.id]: left },
    view: { x: 0, y: 0, zoom: 1 },
    updated: Date.now()
  }
}

/** First-run map: enough structure to show edges, curves and colour at a glance. */
export function welcomeDoc(): MindDoc {
  const root = node('Mind Map', 0, 0, null, 0)
  const move = node('Drag to move', 280, -120, root.id, 1)
  const edit = node('Tap to edit', -280, -60, root.id, 2)
  const nav = node('Pan and zoom', 260, 140, root.id, 3)
  const extra = node('Children fan out', -220, 120, edit.id, 4)
  const deep = node('Folds keep state', 40, -220, move.id, 5)
  return {
    // A fixed id: both display copies can race to seed an empty library, and
    // identical ids keep the winner's write a single map instead of two.
    id: 'welcome',
    name: 'Welcome',
    root: root.id,
    nodes: { [root.id]: root, [move.id]: move, [edit.id]: edit, [nav.id]: nav, [extra.id]: extra, [deep.id]: deep },
    // framed:false asks the first copy with a real viewport to fit the map and
    // publish the result back; a hidden copy measuring 0x0 must not win.
    view: { x: 0, y: 0, zoom: 1, framed: false },
    updated: Date.now()
  }
}

/**
 * Places a new child beside its parent: out the same side the parent sits from
 * its own parent, alternating sides for the root, then below the lowest sibling
 * on that side. Collisions nudge the spot down until it is free.
 */
export function addChild(doc: MindDoc, parentId: string): { doc: MindDoc; id: string } {
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: '' }
  const sibs = childrenOf(doc, parentId)
  const grand = parent.parent ? doc.nodes[parent.parent] : null
  const side = grand ? Math.sign(parent.x - grand.x) || 1 : sibs.length % 2 === 0 ? 1 : -1
  const sameSide = sibs.filter((s) => Math.sign(s.x - parent.x) === side || Math.abs(s.x - parent.x) < 1)
  let y = sameSide.length ? Math.max(...sameSide.map((s) => s.y)) + 110 : parent.y + (side === 0 ? 110 : -30)
  const x = parent.x + side * 250
  const taken = (px: number, py: number) =>
    Object.values(doc.nodes).some((n) => Math.abs(n.x - px) < 150 && Math.abs(n.y - py) < 64)
  while (taken(x, y)) y += 80
  const child = node('New idea', x, y, parentId, (parent.color + 1) % PALETTE_LEN)
  return { doc: touch({ ...doc, nodes: { ...doc.nodes, [child.id]: child } }), id: child.id }
}

/** Deletes a node and every descendant; the root cannot go. */
export function removeSubtree(doc: MindDoc, id: string): MindDoc {
  if (id === doc.root || !doc.nodes[id]) return doc
  const nodes = { ...doc.nodes }
  const kill = (nid: string) => {
    delete nodes[nid]
    for (const kid of Object.values(nodes).filter((n) => n.parent === nid)) kill(kid.id)
  }
  kill(id)
  return touch({ ...doc, nodes })
}

export function moveNode(doc: MindDoc, id: string, x: number, y: number): MindDoc {
  const n = doc.nodes[id]
  if (!n) return doc
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [id]: { ...n, x: clamp(x, -WORLD_LIMIT, WORLD_LIMIT), y: clamp(y, -WORLD_LIMIT, WORLD_LIMIT) }
    }
  }
}

export function renameNode(doc: MindDoc, id: string, text: string): MindDoc {
  const n = doc.nodes[id]
  if (!n) return doc
  return touch({ ...doc, nodes: { ...doc.nodes, [id]: { ...n, text: text.slice(0, TEXT_LIMIT) } } })
}

export function recolorNode(doc: MindDoc, id: string, color: number): MindDoc {
  const n = doc.nodes[id]
  if (!n) return doc
  return touch({ ...doc, nodes: { ...doc.nodes, [id]: { ...n, color: Math.floor(clamp(color, 0, PALETTE_LEN - 1)) } } })
}

export function renameDoc(doc: MindDoc, name: string): MindDoc {
  return { ...doc, name: name.slice(0, 60) }
}

export function setView(doc: MindDoc, view: View): MindDoc {
  return { ...doc, view: cleanView(view) }
}

export function docBounds(doc: MindDoc): { cx: number; cy: number; w: number; h: number } {
  const all = Object.values(doc.nodes)
  const xs = all.map((n) => n.x)
  const ys = all.map((n) => n.y)
  const minX = Math.min(...xs) - 120
  const maxX = Math.max(...xs) + 120
  const minY = Math.min(...ys) - 60
  const maxY = Math.max(...ys) + 60
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}
