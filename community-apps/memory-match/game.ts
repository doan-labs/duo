export type Card = { id: number; symbol: string }
export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

export const SYMBOLS = ['🍎', '🌙', '⭐', '🌈', '🎵', '🚀']
export const COLUMNS = 4
export const ROWS = 3
export const PAIRS = SYMBOLS.length

export function createDeck(random = Math.random): Card[] {
  const cards = [...SYMBOLS, ...SYMBOLS].map((symbol, index) => ({ id: index, symbol }))
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = cards[index]!
    cards[index] = cards[swap]!
    cards[swap] = current
  }
  return cards
}

// Why serialize the deck: the shuffle is random, so the wire carries the dealt
// symbols in board order and both displays lay out the identical board.
export function serializeDeck(deck: Card[]): string[] {
  return deck.map((card) => card.symbol)
}

export function adoptDeck(symbols: string[]): Card[] {
  return symbols.map((symbol, index) => ({ id: index, symbol }))
}

// The grid is four columns by three rows of square cells; width decides and
// height caps it. On a wide box the rail sits beside the board and costs
// width; on the cover it stacks under the board and costs height.
export function fitBoard(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 20 : 16 // root paddingInline
  const top = wide ? 16 : 12 // root paddingTop
  const header = wide ? 56 : 48
  const hint = wide ? 0 : 20
  const gaps = wide ? 16 : 12 // stage gap between board and rail
  const rail = wide ? 186 : 52
  // The home bar owns the bottom 22 px; the New game button stays clear of it.
  const home = 30
  const width = view.width || 740
  const height = view.height || 480
  const freeW = width - padX * 2 - (wide ? rail : 0)
  const freeH = height - top - header - hint - gaps - home - (wide ? 0 : rail)
  const boardWidth = Math.max(0, Math.floor(Math.min(freeW, (freeH * COLUMNS) / ROWS)))
  return { width: boardWidth, height: Math.floor((boardWidth * ROWS) / COLUMNS) }
}
