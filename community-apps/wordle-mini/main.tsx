import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

type GameStatus = 'playing' | 'won' | 'lost'
type TileState = 'empty' | 'correct' | 'present' | 'absent'
const motion = '@media (prefers-reduced-motion: reduce)'
const tileReveal = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.86)' },
  '70%': { opacity: 1, transform: 'scale(1.04)' },
  to: { opacity: 1, transform: 'scale(1)' }
})

const WORDS = [
  'APPLE',
  'BRAVE',
  'CHIME',
  'DREAM',
  'FLAME',
  'GRAPE',
  'HOUSE',
  'LIGHT',
  'MANGO',
  'RIVER',
  'SHARE',
  'TRAIN'
]
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const ROW_KEYS = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4', 'row-5']
const COLUMN_KEYS = ['column-0', 'column-1', 'column-2', 'column-3', 'column-4']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function dailyWord(date: string) {
  const seed = date.split('').reduce((total, character) => total + character.charCodeAt(0), 0)
  return WORDS[seed % WORDS.length]!
}

function parseSaved(value: string | null): { guesses: string[]; status: GameStatus } {
  if (!value) return { guesses: [], status: 'playing' }
  try {
    const parsed = JSON.parse(value) as { guesses?: unknown; status?: unknown }
    const guesses = Array.isArray(parsed.guesses)
      ? parsed.guesses.filter((guess): guess is string => typeof guess === 'string')
      : []
    const status = parsed.status === 'won' || parsed.status === 'lost' ? parsed.status : 'playing'
    return { guesses: guesses.slice(0, 6), status }
  } catch {
    return { guesses: [], status: 'playing' }
  }
}

function tileState(word: string, index: number, solution: string): TileState {
  if (!word[index]) return 'empty'
  if (word[index] === solution[index]) return 'correct'
  if (solution.includes(word[index]!)) return 'present'
  return 'absent'
}

function Game() {
  const view = useDisplay()
  const cover = view.display === 'cover'
  const date = useMemo(today, [])
  const solution = useMemo(() => dailyWord(date), [date])
  const stored = useKV(os.storage, `wordle-${date}`)
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState<GameStatus>('playing')
  const tile = cover ? 18 : Math.max(22, Math.floor((view.height || 480) / 14))
  const keySize = cover ? 22 : 32

  useEffect(() => {
    if (stored.status === 'hydrating') return
    const saved = parseSaved(stored.value)
    setGuesses(saved.guesses)
    setStatus(saved.status)
  }, [stored.status, stored.value])

  useEffect(() => {
    if (stored.status === 'hydrating') return
    if (!guesses.length && status === 'playing') return
    void stored.set(JSON.stringify({ guesses, status }))
  }, [guesses, status, stored.status, stored.set])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const submit = () => {
    if (current.length !== 5 || status !== 'playing') return
    const nextGuesses = [...guesses, current]
    setGuesses(nextGuesses)
    setCurrent('')
    if (current === solution) setStatus('won')
    else if (nextGuesses.length >= 6) setStatus('lost')
  }

  const press = (key: string) => {
    if (status !== 'playing') return
    if (key === 'ENTER') submit()
    else if (key === 'BACK') setCurrent((value) => value.slice(0, -1))
    else if (current.length < 5) setCurrent((value) => value + key)
  }

  const keyboardState = (key: string): TileState => {
    for (const guess of guesses) {
      if (guess.includes(key)) {
        if (solution.includes(key) && guess[solution.indexOf(key)] === key) return 'correct'
        if (solution.includes(key)) return 'present'
        return 'absent'
      }
    }
    return 'empty'
  }

  return (
    <main data-display={view.display} {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO DAILY</span>
          <h1 {...stylex.props(styles.title)}>Wordle Mini</h1>
        </div>
        <span {...stylex.props(styles.counter)}>{guesses.length}/6</span>
      </header>
      <p {...stylex.props(styles.hint)}>
        {status === 'won'
          ? 'Solved for today'
          : status === 'lost'
            ? `The word was ${solution}`
            : 'Guess the five-letter word'}
      </p>
      <div role="grid" aria-label="Wordle guesses" {...stylex.props(styles.board)}>
        {Array.from({ length: 6 }, (_, row) => {
          const word = guesses[row] ?? (row === guesses.length ? current : '')
          return (
            <div
              role="row"
              key={ROW_KEYS[row]}
              {...stylex.props(styles.row, styles.fitRow(tile), row < guesses.length && styles.submitted)}
            >
              {Array.from({ length: 5 }, (_, column) => (
                <div
                  role="gridcell"
                  aria-label={word[column] ? word[column] : 'Empty'}
                  key={COLUMN_KEYS[column]}
                  {...stylex.props(
                    styles.tile,
                    Boolean(word[column]) && styles.filled,
                    styles.fitTile(tile),
                    tileState(word, column, solution) === 'correct' && styles.correct,
                    tileState(word, column, solution) === 'present' && styles.present,
                    tileState(word, column, solution) === 'absent' && styles.absent
                  )}
                >
                  {word[column] ?? ''}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div role="group" aria-label="On-screen keyboard" {...stylex.props(styles.keyboard)}>
        {KEY_ROWS.map((row) => (
          <div key={row} {...stylex.props(styles.keyRow, styles.fitKeyRow(keySize, row.length))}>
            {Array.from(row).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => press(key)}
                {...stylex.props(
                  styles.key,
                  styles.fitKey(keySize),
                  keyboardState(key) === 'correct' && styles.correct,
                  keyboardState(key) === 'present' && styles.present,
                  keyboardState(key) === 'absent' && styles.absent
                )}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div {...stylex.props(styles.keyRow, styles.actionRow)}>
          <button type="button" onClick={() => press('ENTER')} {...stylex.props(styles.actionKey)}>
            ENTER
          </button>
          <button type="button" onClick={() => press('BACK')} {...stylex.props(styles.actionKey)}>
            DELETE
          </button>
        </div>
      </div>
    </main>
  )
}

const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 7,
    paddingBlock: 12,
    paddingInline: 16,
    color: colors.white,
    backgroundColor: colors.darkElevated,
    fontFamily: fonts.system
  },
  cover: { gap: 4, paddingBlock: 7, paddingInline: 10 },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0
  },
  kicker: { color: colors.orange, fontSize: 8, fontWeight: 700, letterSpacing: 1.3 },
  title: { marginBlock: 0, fontSize: 28, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1 },
  counter: { color: colors.grey3, fontSize: 11, fontWeight: 700 },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: 11, flexShrink: 0 },
  board: { display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 },
  row: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 3 },
  fitRow: (size: number) => ({ height: `${String(size)}px` }),
  tile: {
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.fillDark,
    color: colors.white,
    backgroundColor: colors.fillThin,
    fontSize: 16,
    fontWeight: 800,
    transitionProperty: 'transform, background-color, border-color, color',
    transitionDuration: '.16s, .2s, .2s, .2s',
    transitionTimingFunction: 'cubic-bezier(.23, 1, .32, 1)'
  },
  filled: {
    animationName: { default: tileReveal, [motion]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    animationFillMode: 'both'
  },
  submitted: {
    animationName: { default: tileReveal, [motion]: 'none' },
    animationDuration: '.22s',
    animationFillMode: 'both'
  },
  fitTile: (size: number) => ({ width: `${String(size)}px`, height: `${String(size)}px` }),
  correct: { borderColor: colors.greenBright, backgroundColor: colors.green, color: colors.black },
  present: { borderColor: colors.yellow, backgroundColor: colors.yellow, color: colors.black },
  absent: { borderColor: colors.fillDark, backgroundColor: colors.fillDark, color: colors.grey3 },
  keyboard: { display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 },
  keyRow: { display: 'grid', gap: 3 },
  fitKeyRow: (size: number, count: number) => ({ gridTemplateColumns: `repeat(${count}, ${String(size)}px)` }),
  key: {
    borderWidth: 0,
    borderRadius: 5,
    padding: 0,
    color: colors.white,
    backgroundColor: colors.fillDark,
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: '.14s, .18s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.94)' }
  },
  fitKey: (size: number) => ({ width: `${String(size)}px`, height: `${String(size)}px` }),
  actionRow: { gridTemplateColumns: '1fr 1fr' },
  actionKey: {
    borderWidth: 0,
    borderRadius: 5,
    paddingBlock: 6,
    paddingInline: 8,
    color: colors.white,
    backgroundColor: colors.fillDark,
    fontSize: 9,
    fontWeight: 800,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
  }
})

await os.connect()
createRoot(document.body).render(<Game />)
