// Audiobooks: the shelf of editions with a narrator and a length, a per-row
// preview that reads the opening aloud, and the now-playing bar that follows
// the preview around the app.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { GetButton } from './bits.tsx'
import { Cover } from './cover.tsx'
import { audioLength, BOOKS, byId } from './data.ts'
import { own, useLib } from './store.ts'
import { styles } from './styles.ts'
import { openBook } from './ui.ts'
import { cycleRate, stopVoice, toggleVoice, useVoice } from './voice.ts'

const Row = ({ id }: { id: string }) => {
  const b = byId(id)
  const v = useVoice()
  const lib = useLib()
  const playing = v.id === id && v.speaking
  return (
    <div {...stylex.props(styles.audioRow)}>
      <button type="button" {...stylex.props(styles.audioOpen, shared.press)} onClick={() => openBook(id)}>
        <Cover b={b} size="s" />
        <span {...stylex.props(styles.browText)}>
          <span {...stylex.props(styles.browTitle)}>{b.title}</span>
          <span {...stylex.props(styles.browAuthor)}>
            {b.author} · Narrated by {b.audio!.narrator}
          </span>
          <span {...stylex.props(styles.audioLen)}>{audioLength(b)}</span>
        </span>
      </button>
      {v.id === id && (
        <span {...stylex.props(styles.audioBar)}>
          <span {...stylex.props(styles.audioBarFill, styles.progW(Math.round(v.frac * 100)))} />
        </span>
      )}
      <button
        type="button"
        aria-label={playing ? 'Pause preview' : 'Play preview'}
        {...stylex.props(styles.audioPlay, playing && styles.audioPlayOn, shared.press)}
        onClick={() => toggleVoice(id)}
      >
        <Sym name={playing ? 'xmark' : 'volume'} size={15} />
      </button>
      {!lib.owned.includes(id) && <GetButton b={b} onGet={() => own(id)} />}
    </div>
  )
}

/** The bar pinned above the tab bar while a preview plays or is paused. */
export const NowPlaying = () => {
  const v = useVoice()
  if (!v.id) return null
  const b = byId(v.id)
  return (
    <div {...stylex.props(styles.nowBar)}>
      <Cover b={b} size="s" />
      <span {...stylex.props(styles.nowText)}>
        <span {...stylex.props(styles.nowTitle)}>{b.title}</span>
        <span {...stylex.props(styles.nowSub)}>
          {v.speaking ? 'Previewing' : 'Paused'} · {b.audio!.narrator}
        </span>
        <span {...stylex.props(styles.audioBar)}>
          <span {...stylex.props(styles.audioBarFill, styles.progW(Math.round(v.frac * 100)))} />
        </span>
      </span>
      <button type="button" {...stylex.props(styles.nowRate, shared.press)} onClick={cycleRate}>
        {v.rate}x
      </button>
      <button
        type="button"
        aria-label={v.speaking ? 'Pause' : 'Play'}
        {...stylex.props(styles.audioPlay, v.speaking && styles.audioPlayOn, shared.press)}
        onClick={() => toggleVoice()}
      >
        <Sym name={v.speaking ? 'xmark' : 'volume'} size={16} />
      </button>
      <button
        type="button"
        aria-label="Stop preview"
        {...stylex.props(styles.nowRate, shared.press)}
        onClick={stopVoice}
      >
        <Sym name="xmark" size={13} />
      </button>
    </div>
  )
}

export function Audio() {
  const books = BOOKS.filter((b) => b.audio)
  return (
    <>
      <h1 {...stylex.props(styles.headTitle)}>Audiobooks</h1>
      <p {...stylex.props(styles.headSub)}>Preview an edition to hear its opening read aloud.</p>
      <div {...stylex.props(styles.audioList)}>
        {books.map((b) => (
          <Row key={b.id} id={b.id} />
        ))}
      </div>
    </>
  )
}
