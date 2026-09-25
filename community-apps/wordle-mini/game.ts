export type GameStatus = 'playing' | 'won' | 'lost'
export type TileState = 'empty' | 'correct' | 'present' | 'absent'
export type SavedGame = { guesses: string[]; status: GameStatus }
// Why `by` and `day`: both displays share one last-writer-wins session key, so
// a value needs its writer id to skip own writes, and its day to keep a stale
// session from a different date out of today's puzzle.
export type SessionGame = SavedGame & { by: string; day: string; current: string }

export const WORDS = [
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
export const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function dailyWord(date: string) {
  const seed = date.split('').reduce((total, character) => total + character.charCodeAt(0), 0)
  return WORDS[seed % WORDS.length]!
}

function cleanGuesses(value: unknown) {
  return Array.isArray(value)
    ? value.filter((guess): guess is string => typeof guess === 'string').slice(0, MAX_GUESSES)
    : []
}

function cleanStatus(value: unknown): GameStatus {
  return value === 'won' || value === 'lost' ? value : 'playing'
}

export function parseSaved(value: string | null): SavedGame {
  if (!value) return { guesses: [], status: 'playing' }
  try {
    const parsed = JSON.parse(value) as { guesses?: unknown; status?: unknown }
    return { guesses: cleanGuesses(parsed.guesses), status: cleanStatus(parsed.status) }
  } catch {
    return { guesses: [], status: 'playing' }
  }
}

export function parseSession(value: string | null): SessionGame | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as {
      by?: unknown
      day?: unknown
      current?: unknown
      guesses?: unknown
      status?: unknown
    }
    if (typeof parsed.by !== 'string' || typeof parsed.day !== 'string') return null
    return {
      by: parsed.by,
      day: parsed.day,
      guesses: cleanGuesses(parsed.guesses),
      current: typeof parsed.current === 'string' ? parsed.current.slice(0, WORD_LENGTH) : '',
      status: cleanStatus(parsed.status)
    }
  } catch {
    return null
  }
}

export function tileState(word: string, index: number, solution: string): TileState {
  if (!word[index]) return 'empty'
  if (word[index] === solution[index]) return 'correct'
  if (solution.includes(word[index]!)) return 'present'
  return 'absent'
}

export function keyboardState(key: string, guesses: string[], solution: string): TileState {
  for (const guess of guesses) {
    if (guess.includes(key)) {
      if (solution.includes(key) && guess[solution.indexOf(key)] === key) return 'correct'
      if (solution.includes(key)) return 'present'
      return 'absent'
    }
  }
  return 'empty'
}

export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

export type Fit = {
  boardPad: number
  tile: number
  tileGap: number
  tileFont: number
  keyW: number
  keyH: number
  keyGap: number
  keyFont: number
  actionW: number
  kbPad: number
}

// Wide boxes get a side-by-side stage: the board well on the left, the
// keyboard tray on the right. Narrow boxes stack board over keyboard.
export function fitLayout(view: ViewDimensions, wide: boolean): Fit {
  const width = view.width || (wide ? 750 : 355)
  const height = view.height || 540
  if (wide) {
    const padX = 20
    const fixedH = 16 + 32 + 60 + 20 + 24
    const boardPad = 10
    const tileGap = 6
    const tile = Math.max(20, Math.min(56, Math.floor((height - fixedH - boardPad * 2 - tileGap * 5) / 6)))
    const board = tile * WORD_LENGTH + tileGap * (WORD_LENGTH - 1) + boardPad * 2
    const keyGap = 6
    const keyW = Math.max(24, Math.min(44, Math.floor((width - padX * 2 - board - 24 - 24 - keyGap * 9) / 10)))
    return {
      boardPad,
      tile,
      tileGap,
      tileFont: Math.round(tile * 0.52),
      keyW,
      keyH: 46,
      keyGap,
      keyFont: Math.round(keyW * 0.4),
      actionW: Math.round(keyW * 1.5 + keyGap / 2),
      kbPad: 12
    }
  }
  const padX = 12
  const boardPad = 8
  const tileGap = 4
  const keyGap = 4
  const keyH = 38
  const kbPad = 8
  const kbH = keyH * 3 + keyGap * 2 + kbPad * 2
  const fixedH = 10 + 30 + 52 + 16 + 30
  const freeH = height - fixedH - kbH
  const tile = Math.max(
    18,
    Math.min(
      44,
      Math.floor(
        Math.min(
          (freeH - boardPad * 2 - tileGap * 5) / 6,
          (width - padX * 2 - boardPad * 2 - tileGap * 4) / WORD_LENGTH
        )
      )
    )
  )
  const keyW = Math.max(24, Math.floor((width - padX * 2 - kbPad * 2 - keyGap * 9) / 10))
  return {
    boardPad,
    tile,
    tileGap,
    tileFont: Math.round(tile * 0.5),
    keyW,
    keyH,
    keyGap,
    keyFont: Math.round(keyW * 0.38),
    actionW: Math.round(keyW * 1.5 + keyGap / 2),
    kbPad
  }
}
