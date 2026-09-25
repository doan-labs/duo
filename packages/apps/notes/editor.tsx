// The note editor page: toolbar of format, list, table, photo and markup
// actions over the block editor, plus the find bar, the lock gate and the
// Recently Deleted banner. Same component body on both displays; the cover
// moves the toolbar to the bottom edge, the way the iPhone does.

import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Menu, type MenuEntry, Sheet, Title, usePresence, VStack } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import {
  app,
  appAppearance,
  colors,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { daysLeft, type Folder, longStamp, type Note, type TextStyle, textOf, uid } from './data.ts'
import { Editor, type EditorApi, type EditState } from './doc.tsx'
import { type Stroke, useDoc, useFolders, useMarkup, useNotes } from './store.ts'

const INKS = [appAppearance.notesPaper, colors.blueDark, colors.green, colors.yellow, colors.redDark, colors.grey6Dark]
const WIDTHS = [2.4, 4.5, 8]

export function NotePane({ note, compose, trash }: { note?: Note; compose: () => void; trash: (n: Note) => void }) {
  if (!note) return <div {...stylex.props(styles.pane, styles.none, shared.swap)}>No Note Selected</div>
  return <NoteBody key={note.id} note={note} compose={compose} trash={trash} wide />
}

export function NoteSheet({
  note,
  back,
  compose,
  trash
}: {
  note: Note
  back: () => void
  compose: () => void
  trash: (n: Note) => void
}) {
  return (
    <VStack>
      <Title xstyle={[styles.hdrMd]}>
        <button type="button" {...stylex.props(shared.bk, styles.gold)} onClick={back}>
          <Sym name="back" size={20} />
          {note.deleted ? 'Recently Deleted' : 'Notes'}
        </button>
      </Title>
      <div {...stylex.props(styles.bodyBox)}>
        <NoteBody note={note} compose={compose} trash={trash} />
      </div>
    </VStack>
  )
}

// ---------- the body both shells host ----------

function NoteBody({
  note,
  compose,
  trash,
  wide
}: {
  note: Note
  compose: () => void
  trash: (n: Note) => void
  wide?: boolean
}) {
  const { doc, put, status } = useDoc(note)
  const { put: putNote } = useNotes()
  const { folders, add: addFolder } = useFolders()
  const api = useRef<EditorApi>(null)
  const [edit, setEdit] = useState<EditState>({
    s: '',
    ind: 0,
    b: false,
    i: false,
    u: false,
    strike: false,
    table: false,
    undo: false,
    redo: false
  })
  const unlocked = useKV(os.session, `unl:${note.id}`)
  const isLocked = !!note.locked && unlocked.value !== '1'
  const isDeleted = !!note.deleted
  const readOnly = isDeleted

  // menus + sheets
  const [aa, setAa] = useState(false)
  const [dots, setDots] = useState(false)
  const [moving, setMoving] = useState(false)
  const [photos, setPhotos] = useState(false)
  const [copied, setCopied] = useState(false)

  // find in note
  const [finding, setFinding] = useState(false)
  const [findQ, setFindQ] = useState('')
  const [match, setMatch] = useState({ n: 0, at: 0 })
  useEffect(() => {
    // doc rides along so edits re-count while the bar stays open
    if (finding) setMatch({ n: doc.blocks.length ? (api.current?.find(findQ) ?? 0) : 0, at: 0 })
  }, [findQ, doc, finding])
  const jump = (d: 1 | -1) => {
    if (!match.n) return
    const at = (match.at + d + match.n) % match.n
    setMatch({ n: match.n, at })
    api.current?.jump(at)
  }
  const closeFind = () => {
    setFinding(false)
    setFindQ('')
    api.current?.clearFind()
  }

  // document image cache: block.img is the storage key holding a data URL
  const [imgs, setImgs] = useState<Record<string, string>>({})
  useEffect(() => {
    const missing = doc.blocks.filter((b) => b.s === 'image' && !imgs[b.img])
    if (!missing.length) return
    let live = true
    for (const b of missing) {
      if (b.s !== 'image') continue
      void os.storage.get(b.img).then((v) => v && live && setImgs((c) => (c[b.img] ? c : { ...c, [b.img]: v })))
    }
    return () => {
      live = false
    }
  }, [doc, imgs])
  const imageOf = useCallback((key: string) => imgs[key], [imgs])

  const move = (folder?: string) => {
    putNote({ ...note, folder })
    setMoving(false)
  }
  const pin = () => putNote({ ...note, pinned: !note.pinned })
  const lock = () => {
    if (note.locked) unlocked.del()
    putNote({ ...note, locked: !note.locked })
  }
  const copy = () => {
    void navigator.clipboard?.writeText(textOf(doc)).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      },
      () => {}
    )
  }

  // photo -> downscaled data URL under 200 KB -> img:<note>:<id> -> image block
  const addPhoto = async (blob: Blob) => {
    const bmp = await createImageBitmap(blob).catch(() => null)
    if (!bmp) return
    const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height))
    const cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(bmp.width * scale))
    cv.height = Math.max(1, Math.round(bmp.height * scale))
    cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height)
    let url = cv.toDataURL('image/jpeg', 0.82)
    for (const q of [0.7, 0.55, 0.4, 0.3]) {
      if (url.length <= 190_000) break
      url = cv.toDataURL('image/jpeg', q)
    }
    const key = `img:${note.id}:${uid()}`
    try {
      await os.storage.set(key, url)
    } catch {
      return
    }
    setImgs((c) => ({ ...c, [key]: url }))
    api.current?.image(key)
  }

  const menu: MenuEntry[] = isDeleted
    ? [
        { label: 'Recover', icon: 'undo', onSelect: () => putNote({ ...note, deleted: undefined }) },
        { label: 'Delete', icon: 'trash', onSelect: () => trash(note) }
      ]
    : [
        { label: note.pinned ? 'Unpin' : 'Pin Note', icon: 'pin', onSelect: pin },
        { label: note.locked ? 'Remove Lock' : 'Lock Note', icon: 'lock', onSelect: lock },
        ...(!isLocked
          ? ([
              'separator',
              { label: 'Find in Note', icon: 'findOnPage', onSelect: () => setFinding(true) },
              { label: copied ? 'Copied' : 'Copy', icon: 'document', onSelect: copy },
              { label: 'Insert Photo', icon: 'photo', onSelect: () => setPhotos(true) },
              'separator',
              { label: 'Move to…', icon: 'folder', onSelect: () => setMoving(true) }
            ] as MenuEntry[])
          : []),
        'separator',
        {
          label: 'Move to Recently Deleted',
          icon: 'trash',
          onSelect: () => trash(note)
        }
      ]

  const aaMenu: MenuEntry[] = [
    ...(
      [
        ['title', 'Title'],
        ['heading', 'Heading'],
        ['subheading', 'Subheading'],
        ['body', 'Body'],
        ['mono', 'Monostyled']
      ] as [TextStyle, string][]
    ).map(([s, label]) => ({
      label,
      checked: edit.s === s,
      onSelect: () => api.current?.style(s)
    })),
    'separator',
    { label: 'Block Quote', checked: edit.s === 'quote', onSelect: () => api.current?.style('quote') },
    'separator',
    { label: 'Bulleted List', checked: edit.s === 'bullet', onSelect: () => api.current?.style('bullet') },
    { label: 'Dashed List', checked: edit.s === 'dash', onSelect: () => api.current?.style('dash') },
    { label: 'Numbered List', checked: edit.s === 'number', onSelect: () => api.current?.style('number') },
    { label: 'Checklist', checked: edit.s === 'check', onSelect: () => api.current?.checklist() },
    'separator',
    { label: 'Indent', icon: 'forward', disabled: edit.ind >= 4, onSelect: () => api.current?.indent(1) },
    { label: 'Outdent', icon: 'back', disabled: !edit.ind, onSelect: () => api.current?.indent(-1) }
  ]

  const tools = (
    <div {...stylex.props(styles.tools)}>
      <button type="button" {...stylex.props(styles.round, shared.press)} onClick={compose} aria-label="New note">
        <Sym name="compose" size={15} />
      </button>
      <span {...stylex.props(styles.group, (isDeleted || isLocked) && styles.hide)}>
        <button
          type="button"
          {...stylex.props(styles.flat, shared.press, aa && styles.gold)}
          onClick={() => setAa(!aa)}
          aria-label="Format"
          aria-expanded={aa}
        >
          <span {...stylex.props(styles.aa)}>Aa</span>
        </button>
        <button
          type="button"
          {...stylex.props(styles.flat, shared.press, edit.s === 'check' && styles.gold)}
          onClick={() => api.current?.checklist()}
          aria-label="Checklist"
        >
          <Sym name="checklist" size={15} />
        </button>
        <button
          type="button"
          {...stylex.props(styles.flat, shared.press)}
          onClick={() => api.current?.table()}
          aria-label="Table"
        >
          <Sym name="table" size={15} />
        </button>
        <button
          type="button"
          {...stylex.props(styles.flat, shared.press)}
          onClick={() => setPhotos(true)}
          aria-label="Insert photo"
        >
          <Sym name="photo" size={15} />
        </button>
      </span>
      <span {...stylex.props(styles.group, (isDeleted || isLocked) && styles.hide)}>
        <button
          type="button"
          {...stylex.props(styles.flat, shared.press)}
          onClick={() => api.current?.undo()}
          disabled={!edit.undo}
          aria-label="Undo"
        >
          <i {...stylex.props(styles.flat, !edit.undo && styles.dim)}>
            <Sym name="undo" size={15} />
          </i>
        </button>
        <button
          type="button"
          {...stylex.props(styles.flat, shared.press)}
          onClick={() => api.current?.redo()}
          disabled={!edit.redo}
          aria-label="Redo"
        >
          <i {...stylex.props(styles.flat, styles.mirror, !edit.redo && styles.dim)}>
            <Sym name="undo" size={15} />
          </i>
        </button>
      </span>
      {!isLocked && !isDeleted && (
        <button
          type="button"
          {...stylex.props(styles.round, styles.push, shared.press, finding && styles.goldBg)}
          onClick={() => (finding ? closeFind() : setFinding(true))}
          aria-label="Find in note"
        >
          <Sym name="search" size={14} />
        </button>
      )}
      <button
        type="button"
        {...stylex.props(styles.round, shared.press)}
        onClick={() => setDots(!dots)}
        aria-label="More actions"
        aria-expanded={dots}
      >
        <Sym name="ellipsis" size={15} />
      </button>
    </div>
  )

  return (
    <div {...stylex.props(styles.pane, shared.swap)}>
      {wide && tools}
      {isDeleted && <DeletedBar note={note} onRecover={() => putNote({ ...note, deleted: undefined })} />}
      {finding && (
        <div {...stylex.props(styles.findBar, animations.row)}>
          <Sym name="search" size={13} />
          <input
            // biome-ignore lint/a11y/noAutofocus: the bar exists only to be typed into
            autoFocus
            placeholder="Find in Note"
            aria-label="Find in note"
            value={findQ}
            onChange={(e) => setFindQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') jump(e.shiftKey ? -1 : 1)
              if (e.key === 'Escape') closeFind()
            }}
            {...stylex.props(styles.findIn)}
          />
          <span {...stylex.props(styles.findN)}>
            {findQ ? (match.n ? `${match.at + 1} of ${match.n}` : 'No Results') : ''}
          </span>
          <button
            type="button"
            {...stylex.props(styles.flat, shared.press)}
            onClick={() => jump(-1)}
            aria-label="Previous match"
          >
            <Sym name="up" size={13} />
          </button>
          <button
            type="button"
            {...stylex.props(styles.flat, shared.press)}
            onClick={() => jump(1)}
            aria-label="Next match"
          >
            <Sym name="down" size={13} />
          </button>
          <button type="button" {...stylex.props(styles.flat, shared.press, styles.gold)} onClick={closeFind}>
            Done
          </button>
        </div>
      )}
      <div {...stylex.props(styles.docBox)}>
        {isLocked ? (
          <LockView onOpen={() => unlocked.set('1')} />
        ) : status !== 'hydrating' ? (
          <Editor
            doc={doc}
            onDoc={(next) => put(next)}
            api={api}
            readOnly={readOnly}
            images={imageOf}
            onCaret={setEdit}
          />
        ) : null}
        {!isLocked && <MarkupLayer note={note} readOnly={readOnly} />}
      </div>
      <div role="status" aria-live="polite" {...stylex.props(styles.save)}>
        {status === 'error' ? 'Not saved' : longStamp(note)}
      </div>
      {!wide && !isDeleted && !isLocked && tools}
      <Menu
        open={aa}
        onClose={() => setAa(false)}
        items={aaMenu}
        size={14}
        xstyle={[styles.menuAa, wide ? styles.menuTop : styles.menuBottom]}
      />
      <Menu
        open={dots}
        onClose={() => setDots(false)}
        items={menu}
        size={15}
        xstyle={[styles.menuDots, wide ? styles.menuTop : styles.menuBottom]}
      />
      <MoveSheet
        open={moving}
        onClose={() => setMoving(false)}
        note={note}
        folders={folders}
        onPick={move}
        onNew={(name) => move(addFolder(name).id)}
      />
      <PhotoSheet open={photos} onClose={() => setPhotos(false)} onPick={addPhoto} />
    </div>
  )
}

/** The deadbolt screen over a locked note; double-press the side button to open. */
function LockView({ onOpen }: { onOpen: () => void }) {
  const open = useRef(onOpen)
  open.current = onOpen
  useEffect(() => {
    void os.sideButton.claim().catch(() => {})
    const off = os.sideButton.onDouble(() => open.current())
    return () => {
      off()
      void os.sideButton.release().catch(() => {})
    }
  }, [])
  return (
    <div {...stylex.props(styles.lock)}>
      <i {...stylex.props(styles.lockIc)}>
        <Sym name="lock" size={26} />
      </i>
      <div {...stylex.props(styles.lockT)}>This note is locked.</div>
      <button type="button" {...stylex.props(styles.lockBtn, shared.press)} onClick={onOpen}>
        View Note
      </button>
      <div {...stylex.props(styles.lockHint)}>Or double-press the side button</div>
    </div>
  )
}

/** The "In Recently Deleted" ribbon with its one action. */
function DeletedBar({ note, onRecover }: { note: Note; onRecover: () => void }) {
  return (
    <div {...stylex.props(styles.delBar)}>
      <Sym name="trash" size={14} />
      <span {...stylex.props(styles.delTx)}>
        This note is in Recently Deleted.
        <b {...stylex.props(styles.delDays)}> {daysLeft(note)} days remaining</b>
      </span>
      <button type="button" {...stylex.props(styles.delBtn, shared.press)} onClick={onRecover}>
        Recover
      </button>
    </div>
  )
}

/** The "Move to" card: every folder plus a New Folder line. */
export function MoveSheet({
  open,
  onClose,
  note,
  folders,
  onPick,
  onNew
}: {
  open: boolean
  onClose: () => void
  note: Note
  folders: Folder[]
  onPick: (folder?: string) => void
  onNew: (name: string) => void
}) {
  const [naming, setNaming] = useState(false)
  return (
    <Sheet open={open} onClose={onClose}>
      <div {...stylex.props(styles.sheetHd)}>Move “{note.title || 'New Note'}” to</div>
      <div {...stylex.props(styles.sheetList)}>
        <FolderRow name="Notes" on={!note.folder} pick={() => onPick(undefined)} />
        {folders.map((f) => (
          <FolderRow key={f.id} name={f.name} on={note.folder === f.id} pick={() => onPick(f.id)} />
        ))}
        {naming ? (
          <div {...stylex.props(styles.sheetRow)}>
            <Sym name="newFolder" size={16} />
            <input
              // biome-ignore lint/a11y/noAutofocus: the row exists only to be typed into
              autoFocus
              placeholder="New Folder"
              aria-label="Folder name"
              {...stylex.props(styles.sheetIn)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) onNew(e.currentTarget.value.trim())
                if (e.key === 'Escape') setNaming(false)
              }}
              onBlur={() => setNaming(false)}
            />
          </div>
        ) : (
          <button type="button" {...stylex.props(styles.sheetRow, shared.select)} onClick={() => setNaming(true)}>
            <Sym name="newFolder" size={16} />
            <span {...stylex.props(styles.gold)}>New Folder</span>
          </button>
        )}
      </div>
    </Sheet>
  )
}

const FolderRow = ({ name, on, pick }: { name: string; on: boolean; pick: () => void }) => (
  <button type="button" {...stylex.props(styles.sheetRow, shared.select)} onClick={pick}>
    <Sym name="folder" size={16} />
    <span {...stylex.props(styles.sheetName)}>{name}</span>
    {on && <Sym name="tick" size={14} />}
  </button>
)

// ---------- photo library sheet ----------

function PhotoSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (b: Blob) => void }) {
  const [pics, setPics] = useState<{ id: string; src: string }[]>([])
  const [empty, setEmpty] = useState(false)
  useEffect(() => {
    if (!open) return
    let live = true
    void os.photos
      .list()
      .then(async (list) => {
        const all = await Promise.all(
          list.map(async (p) => ({ id: p.id, src: await dataUrl(await os.photos.get(p.id)) }))
        )
        if (live) {
          setPics(all)
          setEmpty(!all.length)
        }
      })
      .catch(() => live && setEmpty(true))
    return () => {
      live = false
      setPics([])
      setEmpty(false)
    }
  }, [open])
  return (
    <Sheet open={open} onClose={onClose}>
      <div {...stylex.props(styles.sheetHd)}>Photos</div>
      <div {...stylex.props(styles.photoGrid)}>
        {empty && <div {...stylex.props(styles.photoNone)}>No Photos</div>}
        {!empty && !pics.length && <div {...stylex.props(styles.photoNone)}>Loading…</div>}
        {pics.map((p) => (
          <button
            key={p.id}
            type="button"
            {...stylex.props(styles.photoCell, shared.press)}
            onClick={() => {
              onPick(blobFrom(p.src))
              onClose()
            }}
            aria-label="Insert photo"
          >
            <img src={p.src} {...stylex.props(styles.photoImg)} alt="" />
          </button>
        ))}
      </div>
    </Sheet>
  )
}

const dataUrl = (blob: Blob) =>
  new Promise<string>((done) => {
    const r = new FileReader()
    r.onload = () => done(String(r.result))
    r.readAsDataURL(blob)
  })

const blobFrom = (src: string): Blob => {
  const [head, body] = src.split(',')
  const mime = /data:(.*?);/.exec(head ?? '')?.[1] ?? 'image/jpeg'
  const bin = atob(body ?? '')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ---------- markup: a canvas over the note, strokes stored as vectors ----------

function MarkupLayer({ note, readOnly }: { note: Note; readOnly?: boolean }) {
  const { strokes, put } = useMarkup(note)
  const [marking, setMarking] = useState(false)
  const [pen, setPen] = useState(0)
  const [wide2, setWide2] = useState(0)
  const [erase, setErase] = useState(false)
  const palette = usePresence(marking)
  const cv = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const live = useRef<Stroke | undefined>(undefined)

  const paint = useCallback(() => {
    const el = cv.current
    const host = box.current
    if (!el || !host) return
    const r = host.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    if (el.width !== Math.round(r.width * dpr) || el.height !== Math.round(r.height * dpr)) {
      el.width = Math.round(r.width * dpr)
      el.height = Math.round(r.height * dpr)
    }
    const ctx = el.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, r.width, r.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of live.current ? [...strokes, live.current] : strokes) draw(ctx, s, r)
  }, [strokes])

  useEffect(paint, [paint])
  useEffect(() => {
    const ro = new ResizeObserver(paint)
    box.current && ro.observe(box.current)
    return () => ro.disconnect()
  }, [paint])

  const pt = (e: ReactPointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
  }
  const hit = (s: Stroke, x: number, y: number, r: number) => {
    for (let i = 0; i + 1 < s.pts.length; i += 2) {
      const dx = s.pts[i]! - x
      const dy = s.pts[i + 1]! - y
      if (Math.hypot(dx, dy) < r) return true
    }
    return false
  }
  const down = (e: ReactPointerEvent) => {
    if (!marking) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const [x, y] = pt(e)
    if (erase) {
      put(strokes.filter((s) => !hit(s, x!, y!, 0.04)))
      return
    }
    live.current = { c: INKS[pen]!, w: WIDTHS[wide2]!, pts: [x!, y!] }
  }
  const move = (e: ReactPointerEvent) => {
    if (!marking) return
    const [x, y] = pt(e)
    if (erase && e.buttons) {
      const left = strokes.filter((s) => !hit(s, x!, y!, 0.04))
      if (left.length !== strokes.length) put(left)
      return
    }
    if (!live.current) return
    live.current.pts.push(x!, y!)
    paint()
  }
  const up = () => {
    if (!marking || erase || !live.current) return
    if (live.current.pts.length >= 2) put([...strokes, live.current])
    live.current = undefined
    paint()
  }

  return (
    <>
      {/* the markup canvas sits over the editor, dead to touches when off */}
      <div ref={box} {...stylex.props(styles.markBox, !marking && styles.markOff)}>
        <canvas
          ref={cv}
          {...stylex.props(styles.markCv)}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => {
            live.current = undefined
            paint()
          }}
        />
      </div>
      {!readOnly && (
        <button
          type="button"
          {...stylex.props(styles.markFab, shared.press, marking && styles.markFabOn)}
          onClick={() => setMarking(!marking)}
          aria-pressed={marking}
          aria-label="Markup"
        >
          <Sym name="markup" size={17} />
        </button>
      )}
      {palette.mounted && (
        <div
          role="toolbar"
          aria-label="Markup tools"
          {...stylex.props(styles.palette, animations.float, palette.closing && animations.floatOut)}
        >
          <button
            type="button"
            {...stylex.props(styles.flat, shared.press, !strokes.length && styles.dim)}
            onClick={() => put(strokes.slice(0, -1))}
            aria-label="Undo stroke"
          >
            <Sym name="undo" size={16} />
          </button>
          <i {...stylex.props(styles.bar)} />
          {INKS.map((c, i) => (
            <button
              key={c}
              type="button"
              {...stylex.props(styles.ink, shared.press, styles.fill(c), i === pen && !erase && styles.inkOn)}
              onClick={() => {
                setPen(i)
                setErase(false)
              }}
              aria-label="Pen colour"
            />
          ))}
          <i {...stylex.props(styles.bar)} />
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              type="button"
              {...stylex.props(styles.wDot, shared.press, i === wide2 && !erase && styles.wDotOn)}
              onClick={() => {
                setWide2(i)
                setErase(false)
              }}
              aria-label="Stroke width"
            >
              <i {...stylex.props(styles.wDotIn(w))} />
            </button>
          ))}
          <button
            type="button"
            {...stylex.props(styles.flat, shared.press, erase && styles.gold)}
            onClick={() => setErase(!erase)}
            aria-pressed={erase}
            aria-label="Eraser"
          >
            <Sym name="minus" size={16} />
          </button>
          <button
            type="button"
            {...stylex.props(styles.flat, styles.gold, shared.press)}
            onClick={() => setMarking(false)}
          >
            Done
          </button>
        </div>
      )}
    </>
  )
}

const draw = (ctx: CanvasRenderingContext2D, s: Stroke, r: DOMRect) => {
  ctx.strokeStyle = s.c
  ctx.lineWidth = s.w
  ctx.beginPath()
  const pts = s.pts
  if (pts.length === 2) {
    ctx.moveTo(pts[0]! * r.width, pts[1]! * r.height)
    ctx.lineTo(pts[0]! * r.width + 0.1, pts[1]! * r.height + 0.1)
  } else {
    ctx.moveTo(pts[0]! * r.width, pts[1]! * r.height)
    for (let i = 2; i + 1 < pts.length; i += 2) ctx.lineTo(pts[i]! * r.width, pts[i + 1]! * r.height)
  }
  ctx.stroke()
}

const styles = stylex.create({
  gold: { color: colors.yellow, opacity: 1 },
  goldBg: { color: colors.yellow, backgroundColor: app.fill },
  dim: { opacity: 0.3 },
  mirror: { transform: 'scaleX(-1)' },
  push: { marginLeft: 'auto' },
  flat: { display: 'flex', color: colors.white, flexShrink: 0, alignItems: 'center' },
  pane: {
    position: 'relative',
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  none: { alignItems: 'center', justifyContent: 'center', color: colors.grey },
  bodyBox: { flexGrow: 1, minHeight: 0, display: 'flex' },
  hdrMd: { fontSize: typeScale.body, lineHeight: leading.body, letterSpacing: tracking.body },
  tools: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingInline: 7,
    height: 40,
    flexShrink: 0,
    borderBottomWidth: 0,
    position: 'relative',
    zIndex: 2
  },
  round: {
    width: 27,
    height: 27,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill2,
    color: colors.white,
    flexShrink: 0
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    paddingInline: 11,
    height: 27,
    borderRadius: radius.xl,
    backgroundColor: app.fill2
  },
  aa: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    paddingBottom: 1
  },
  docBox: { flexGrow: 1, minHeight: 0, display: 'flex', position: 'relative' },
  save: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: colors.grey,
    textAlign: 'center',
    paddingBottom: 6,
    minHeight: 16,
    flexShrink: 0
  },
  // ---------- find bar ----------
  findBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginInline: 8,
    marginBlock: 4,
    paddingInline: 10,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: colors.grey,
    flexShrink: 0
  },
  findIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  findN: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    whiteSpace: 'nowrap'
  },
  // ---------- menus ----------
  menuAa: {
    position: 'absolute',
    left: 8,
    width: 190,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  menuDots: {
    position: 'absolute',
    right: 8,
    width: 200,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  menuTop: { top: 42 },
  menuBottom: { bottom: 42 },
  // ---------- lock gate ----------
  lock: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24
  },
  lockIc: { color: colors.grey, marginBottom: 2 },
  lockT: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  lockBtn: {
    marginTop: 6,
    paddingBlock: 7,
    paddingInline: 22,
    borderRadius: radius.pill,
    backgroundColor: app.fill2,
    color: colors.yellow,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  lockHint: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: colors.grey
  },
  // ---------- deleted ribbon ----------
  delBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginInline: 12,
    marginTop: 6,
    paddingBlock: 7,
    paddingInline: 10,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: colors.grey,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    flexShrink: 0
  },
  delTx: { minWidth: 0, flexGrow: 1 },
  delDays: { fontWeight: weight.semibold, color: colors.white },
  delBtn: {
    paddingBlock: 4,
    paddingInline: 12,
    borderRadius: radius.pill,
    backgroundColor: app.fill2,
    color: colors.yellow,
    fontWeight: weight.semibold,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  // ---------- sheets ----------
  sheetHd: {
    paddingTop: 18,
    paddingBottom: 8,
    paddingInline: 18,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.label2,
    textAlign: 'center'
  },
  sheetList: { paddingBottom: 14, paddingInline: 8 },
  sheetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: radius.sm,
    color: colors.yellow,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    textAlign: 'left',
    cursor: 'pointer'
  },
  sheetName: {
    color: colors.white,
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  sheetIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 3,
    padding: 10,
    maxHeight: 300,
    overflowY: 'auto'
  },
  photoCell: { padding: 0, borderRadius: radius.xs, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoNone: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: colors.grey,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    paddingBlock: 30
  },
  // ---------- markup ----------
  markBox: { position: 'absolute', inset: 0, zIndex: 3 },
  hide: { display: 'none' },
  markOff: { pointerEvents: 'none' },
  markCv: { position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' },
  markFab: {
    position: 'absolute',
    right: 10,
    bottom: 30,
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.notesInk,
    color: colors.white,
    boxShadow: shadow.float,
    zIndex: 4
  },
  markFabOn: { color: appAppearance.notesYellow },
  palette: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    translate: '-50%',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    height: 52,
    paddingInline: 12,
    borderRadius: radius.xl,
    backgroundColor: appAppearance.notesInk,
    boxShadow: shadow.float,
    zIndex: 5
  },
  bar: { width: 1, height: 24, backgroundColor: app.separator },
  ink: { width: 15, height: 15, borderRadius: radius.circle, flexShrink: 0 },
  fill: (c: string) => ({ backgroundColor: c }),
  inkOn: {
    outlineWidth: 1.5,
    outlineStyle: 'solid',
    outlineColor: colors.white,
    outlineOffset: 1.5,
    transform: 'scale(1.15)'
  },
  wDot: {
    width: 15,
    height: 15,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill2
  },
  wDotIn: (w: number) => ({
    width: 3 + w,
    height: 3 + w,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    display: 'block'
  }),
  wDotOn: { outlineWidth: 1.5, outlineStyle: 'solid', outlineColor: colors.white, outlineOffset: 1.5 }
})
