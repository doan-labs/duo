// The recording page: waveform scrubber, transport, rate, transcript and the
// actions menu. It reads the memo live from the store so rename and edits
// repaint in place, and it pushes the trim/replace editor.

import { mmss } from '@doan-labs/duo-fixtures'
import {
  Button,
  List,
  Menu,
  type MenuEntry,
  Page,
  Row,
  Section,
  Segmented,
  Sheet,
  Sym,
  TextField,
  useNav
} from '@doan-labs/duo-uikit'
import {
  app,
  appAppearance,
  colors,
  leading,
  radius,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState, useSyncExternalStore } from 'react'
import { download, ext } from './audio.ts'
import { EditMemo } from './edit.tsx'
import { pausePlay, playMemo, ratePlay, readFile, scrubMemo, skipPlay, speechSupported, usePlay } from './engine.ts'
import { Glyph } from './glyphs.tsx'
import { Transport } from './list.tsx'
import { foldersCell, type Memo, memoOps, memosCell } from './store.ts'
import { Wave } from './wave.tsx'

const RATES = ['0.5', '1', '1.5', '2'] as const

export function Detail({ memo, back }: { memo: Memo; back: () => void }) {
  const all = useSyncExternalStore(memosCell.subscribe, memosCell.get)
  const live = all.find((m) => m.id === memo.id)
  const nav = useNav()
  const [menu, setMenu] = useState(false)
  const [rename, setRename] = useState(false)
  const [move, setMove] = useState(false)
  const [exportError, setExportError] = useState('')
  const play = usePlay()
  const playing = play?.id === memo.id && play.playing
  const posMs = play?.id === memo.id ? play.posMs : 0
  const rate = play?.id === memo.id ? play.rate : 1
  const folders = useSyncExternalStore(foldersCell.subscribe, foldersCell.get)
  // A trashed or erased memo can vanish under this page; fall back to the
  // snapshot it opened with so the page never crashes mid-pop.
  const m = live ?? memo

  const exportMemo = async () => {
    setExportError('')
    try {
      const blob = await readFile(m.file)
      if (!blob) throw new Error('missing')
      download(`${m.name}.${ext(m.mime)}`, blob)
    } catch {
      setExportError('Export failed - the file could not be read from storage.')
    }
  }

  const menuItems: MenuEntry[] = [
    { label: 'Rename…', icon: 'compose', onSelect: () => setRename(true) },
    {
      label: m.fav ? 'Unfavorite' : 'Favorite',
      icon: m.fav ? 'heartFill' : 'heart',
      onSelect: () => memoOps.toggleFav(m.id)
    },
    { label: 'Move to Folder…', icon: 'folder', onSelect: () => setMove(true) },
    { label: 'Edit Recording', icon: 'compose', onSelect: () => nav.push((b) => <EditMemo memo={m} back={b} />) },
    { label: 'Export…', icon: 'share', onSelect: () => void exportMemo() },
    'separator',
    {
      label: 'Delete',
      icon: 'trash',
      onSelect: () => {
        memoOps.trash([m.id])
        back()
      }
    }
  ]

  return (
    <Page
      title={
        <span {...stylex.props(styles.title)}>
          {m.name}
          {m.demo && <span {...stylex.props(styles.demoTag)}>Demo</span>}
        </span>
      }
      back={back}
    >
      <div {...stylex.props(styles.sub)}>
        {new Date(m.at).toLocaleString('en', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}
      </div>
      <div {...stylex.props(styles.waveWrap)}>
        <Wave peaks={m.peaks} pos={m.ms ? posMs / m.ms : 0} onScrub={(p) => scrubMemo(m, p * m.ms)} height={110} />
      </div>
      <div {...stylex.props(styles.times)}>
        <span>{mmss(posMs / 1000)}</span>
        <span {...stylex.props(styles.dim)}>-{mmss(Math.max(0, m.ms - posMs) / 1000)}</span>
      </div>
      <div {...stylex.props(styles.transport)}>
        <Transport name="back15" label="Back 15 seconds" onPress={() => skipPlay(-15_000)} />
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          {...stylex.props(styles.playBtn)}
          onClick={() => (playing ? pausePlay() : void playMemo(m))}
        >
          <Glyph name={playing ? 'pause' : 'play'} size={30} />
        </button>
        <Transport name="fwd15" label="Forward 15 seconds" onPress={() => skipPlay(15_000)} />
      </div>
      <div {...stylex.props(styles.rateRow)}>
        <Segmented
          options={RATES}
          value={(RATES.find((r) => Number(r) === rate) ?? '1') as (typeof RATES)[number]}
          onChange={(r) => ratePlay(Number(r))}
          aria-label="Playback speed"
        />
        <span {...stylex.props(styles.dim)}>speed</span>
      </div>
      <div {...stylex.props(styles.actions)}>
        <button
          type="button"
          aria-expanded={menu}
          aria-label="Recording actions"
          {...stylex.props(styles.moreBtn)}
          onClick={() => setMenu(true)}
        >
          <Sym name="ellipsis" size={18} />
        </button>
        <Menu open={menu} onClose={() => setMenu(false)} items={menuItems} xstyle={[styles.menu]} />
      </div>
      {exportError && <div {...stylex.props(styles.error)}>{exportError}</div>}
      <Section xstyle={[styles.transcript]}>
        <div {...stylex.props(styles.tTitle)}>Transcript</div>
        {m.transcript ? (
          <div {...stylex.props(styles.tBody)}>{m.transcript}</div>
        ) : (
          <div {...stylex.props(styles.tNone)}>
            {speechSupported ? 'No transcript for this recording.' : 'Transcription is not supported in this browser.'}
          </div>
        )}
      </Section>
      {rename && <RenameSheet memo={m} onClose={() => setRename(false)} />}
      {move && <MoveSheet memo={m} folders={folders} onClose={() => setMove(false)} />}
    </Page>
  )
}

function RenameSheet({ memo, onClose }: { memo: Memo; onClose: () => void }) {
  const [name, setName] = useState(memo.name)
  return (
    <Sheet open onClose={onClose}>
      <div {...stylex.props(styles.sheet)}>
        <div {...stylex.props(styles.sheetTitle)}>Rename</div>
        <TextField
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              memoOps.rename(memo.id, name)
              onClose()
            }
          }}
        />
        <div {...stylex.props(styles.rowBtns)}>
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="plain"
            disabled={!name.trim()}
            onClick={() => {
              memoOps.rename(memo.id, name)
              onClose()
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function MoveSheet({
  memo,
  folders,
  onClose
}: {
  memo: Memo
  folders: { id: string; name: string }[]
  onClose: () => void
}) {
  return (
    <Sheet open onClose={onClose}>
      <div {...stylex.props(styles.sheet)}>
        <div {...stylex.props(styles.sheetTitle)}>Move to Folder</div>
        <List>
          <Row
            as="button"
            label="All Recordings"
            detail={!memo.folder ? 'current' : undefined}
            onClick={() => {
              memoOps.moveTo([memo.id], undefined)
              onClose()
            }}
          />
          {folders.map((f) => (
            <Row
              key={f.id}
              as="button"
              label={f.name}
              icon={<Sym name="folder" size={16} />}
              detail={memo.folder === f.id ? 'current' : undefined}
              onClick={() => {
                memoOps.moveTo([memo.id], f.id)
                onClose()
              }}
            />
          ))}
        </List>
        {folders.length === 0 && (
          <div {...stylex.props(styles.dim)}>No folders yet - create one from the list menu.</div>
        )}
      </div>
    </Sheet>
  )
}

const styles = stylex.create({
  title: { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 },
  demoTag: {
    fontSize: typeScale.caption2,
    color: colors.yellowDark,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.yellowDark,
    borderRadius: radius.xs,
    paddingInline: 4,
    flexShrink: 0
  },
  sub: { paddingInline: space.lg, color: app.label2, fontSize: typeScale.footnote },
  waveWrap: {
    marginInline: space.lg,
    marginTop: space.md,
    paddingBlock: space.sm,
    backgroundColor: appAppearance.memosFill,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  times: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingInline: space.lg,
    paddingTop: space.xs,
    fontVariantNumeric: 'tabular-nums',
    fontSize: typeScale.caption1
  },
  dim: { color: app.label3 },
  transport: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    paddingTop: space.sm
  },
  playBtn: {
    width: 64,
    height: 64,
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.memosFill,
    color: app.fg,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer'
  },
  rateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingTop: space.md
  },
  actions: { display: 'flex', justifyContent: 'center', paddingTop: space.md },
  moreBtn: {
    borderWidth: 0,
    backgroundColor: appAppearance.memosFill,
    color: app.fg,
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer'
  },
  menu: { position: 'absolute', top: 40, right: space.lg },
  error: {
    marginInline: space.lg,
    marginTop: space.sm,
    color: colors.red,
    fontSize: typeScale.footnote,
    textAlign: 'center'
  },
  transcript: { paddingInline: space.lg, paddingTop: space.lg },
  tTitle: { fontSize: typeScale.footnote, fontWeight: weight.semibold, color: app.label2, paddingBottom: space.xs },
  tBody: {
    fontSize: typeScale.subheadline,
    color: app.fg,
    lineHeight: leading.body,
    backgroundColor: appAppearance.memosFill,
    borderRadius: radius.md,
    padding: space.md
  },
  tNone: { fontSize: typeScale.footnote, color: app.label3 },
  sheet: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: { fontSize: typeScale.headline, fontWeight: weight.semibold },
  rowBtns: { display: 'flex', justifyContent: 'flex-end', gap: space.sm }
})
