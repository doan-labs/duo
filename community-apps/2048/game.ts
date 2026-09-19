export type Direction = 'left' | 'right' | 'up' | 'down'
export type GameStatus = 'playing' | 'won' | 'over'
export type Tile = {
  id: number
  value: number
  row: number
  column: number
  fresh: boolean
  merged: boolean
  // Why pending value: the survivor keeps its old value/color during the
  // glide and flips to the merged value on arrival. Flipping immediately
  // would repaint the tile mid-flight instead of on landing.
  nextValue?: number
  // Why a target: the absorbed partner mounts at its origin cell, then glides
  // into the destination. Without it the partner would teleport to the target
  // and sit there while the survivor travels alone.
  target?: { row: number; column: number }
}

export const SIZE = 4
export const CELL_COUNT = SIZE * SIZE

// Why a module counter: ids stay stable across moves so React moves the same
// DOM node, which is what makes the CSS transform glide instead of remounting.
let nextTileId = 1

export function spawnTile(tiles: Tile[], random = Math.random) {
  const taken = new Set(tiles.map((tile) => tile.row * SIZE + tile.column))
  const empty: number[] = []
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (!taken.has(index)) empty.push(index)
  }
  if (!empty.length) return tiles
  const index = empty[Math.floor(random() * empty.length)]!
  const id = nextTileId
  nextTileId += 1
  return [
    ...tiles,
    {
      id,
      value: random() < 0.9 ? 2 : 4,
      row: Math.floor(index / SIZE),
      column: index % SIZE,
      fresh: true,
      merged: false
    }
  ]
}

export function newGame() {
  nextTileId = 1
  return spawnTile(spawnTile([]))
}

function lineCells(lineIndex: number, direction: Direction) {
  return direction === 'left'
    ? Array.from({ length: SIZE }, (_, offset) => ({ row: lineIndex, column: offset }))
    : direction === 'right'
      ? Array.from({ length: SIZE }, (_, offset) => ({ row: lineIndex, column: SIZE - 1 - offset }))
      : direction === 'up'
        ? Array.from({ length: SIZE }, (_, offset) => ({ row: offset, column: lineIndex }))
        : Array.from({ length: SIZE }, (_, offset) => ({ row: SIZE - 1 - offset, column: lineIndex }))
}

function slide(line: Tile[]) {
  const merged: { tile: Tile; absorbed?: Tile; value: number }[] = []
  let score = 0
  for (let index = 0; index < line.length; index += 1) {
    const tile = line[index]!
    const partner = line[index + 1]
    if (partner && partner.value === tile.value) {
      const value = tile.value * 2
      score += value
      merged.push({ tile, absorbed: partner, value })
      index += 1
    } else {
      merged.push({ tile, value: tile.value })
    }
  }
  return { merged, score }
}

export function move(tiles: Tile[], direction: Direction) {
  const next: Tile[] = []
  const absorbed: Tile[] = []
  let score = 0
  let moved = false
  const byCell = new Map(tiles.map((tile) => [`${tile.row}-${tile.column}`, tile]))

  for (let lineIndex = 0; lineIndex < SIZE; lineIndex += 1) {
    const cells = lineCells(lineIndex, direction)
    const line = cells.flatMap((cell) => {
      const tile = byCell.get(`${cell.row}-${cell.column}`)
      return tile ? [tile] : []
    })
    const result = slide(line)
    score += result.score
    if (result.merged.length !== line.length) moved = true
    result.merged.forEach((entry, offset) => {
      const cell = cells[offset]!
      if (entry.absorbed) {
        moved = true
        absorbed.push({ ...entry.absorbed, fresh: false, merged: false, target: { row: cell.row, column: cell.column } })
        next.push({
          ...entry.tile,
          row: cell.row,
          column: cell.column,
          fresh: false,
          merged: true,
          nextValue: entry.value
        })
      } else {
        if (entry.tile.row !== cell.row || entry.tile.column !== cell.column) moved = true
        next.push({ ...entry.tile, value: entry.value, row: cell.row, column: cell.column, fresh: false, merged: false })
      }
    })
  }

  if (!moved) return { tiles, absorbed: [] as Tile[], score: 0, moved: false }
  return { tiles: spawnTile(next), absorbed, score, moved: true }
}

function boardValues(tiles: Tile[]) {
  const board = Array.from({ length: CELL_COUNT }, () => 0)
  for (const tile of tiles) board[tile.row * SIZE + tile.column] = Math.max(board[tile.row * SIZE + tile.column]!, tile.value)
  return board
}

export function hasMoves(tiles: Tile[]) {
  if (tiles.length < CELL_COUNT) return true
  const board = boardValues(tiles)
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const index = row * SIZE + column
      if (column < SIZE - 1 && board[index] === board[index + 1]) return true
      if (row < SIZE - 1 && board[index] === board[index + SIZE]) return true
    }
  }
  return false
}
