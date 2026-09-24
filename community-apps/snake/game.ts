export type Point = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'
export type Status = 'ready' | 'playing' | 'over'
export type Game = {
  snake: Point[]
  food: Point
  score: number
  status: Status
  round: number
  eatTick: number
  lastMeal: Point
}
export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }
export type BoardMetrics = { padding: number; gap: number; cell: number }

export const BOARD_SIZE = 14

const STARTING_SNAKE: Point[] = [
  { x: 6, y: 7 },
  { x: 5, y: 7 },
  { x: 4, y: 7 }
]

export const pointKey = (point: Point) => `${point.x}:${point.y}`
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

function openFood(snake: Point[]) {
  const occupied = new Set(snake.map(pointKey))
  const free: Point[] = []
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) free.push({ x, y })
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 10, y: 7 }
}

export function newGame(round = 0): Game {
  return {
    snake: STARTING_SNAKE.map((point) => ({ ...point })),
    food: { x: 10, y: 7 },
    score: 0,
    status: 'ready',
    round,
    eatTick: 0,
    lastMeal: { x: 10, y: 7 }
  }
}

export function nextGame(game: Game, direction: Direction): Game {
  const head = game.snake[0]!
  const nextHead = {
    x: head.x + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0),
    y: head.y + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0)
  }
  const outside = nextHead.x < 0 || nextHead.x >= BOARD_SIZE || nextHead.y < 0 || nextHead.y >= BOARD_SIZE
  const hitsBody = game.snake.slice(0, -1).some((point) => samePoint(point, nextHead))
  if (outside || hitsBody) return { ...game, status: 'over' }

  const ate = samePoint(nextHead, game.food)
  const snake = ate ? [nextHead, ...game.snake] : [nextHead, ...game.snake.slice(0, -1)]
  return {
    snake,
    food: ate ? openFood(snake) : game.food,
    score: game.score + (ate ? 1 : 0),
    status: 'playing',
    round: game.round,
    eatTick: game.eatTick + (ate ? 1 : 0),
    // Where the last meal was eaten, for the burst effect; the food itself already moved on.
    lastMeal: ate ? game.food : game.lastMeal
  }
}

export function fitLayout(view: ViewDimensions, headerHeight: number, wide: boolean) {
  const cover = view.display === 'cover'
  const padding = cover ? 10 : 14
  const gap = cover ? 6 : 8
  const control = cover ? 32 : 36
  const hint = 18
  const width = view.width || 740
  const height = view.height || 480
  // Wide boxes put the control deck on a rail beside the board, so it costs width not height.
  if (wide) {
    const rail = control * 3 + 6 * 2 + 24
    const fixedHeight = padding * 2 + headerHeight + hint + gap * 2
    return {
      board: Math.max(0, Math.floor(Math.min(width - padding * 2 - rail - gap, height - fixedHeight))),
      control,
      rail
    }
  }
  const strip = control * 2 + 6
  const fixedHeight = padding * 2 + headerHeight + hint + strip + gap * 5
  return {
    board: Math.max(0, Math.floor(Math.min(width - padding * 2, height - fixedHeight))),
    control,
    rail: 0
  }
}

export function getBoardMetrics(size: number): BoardMetrics {
  const padding = Math.max(7, Math.round(size * 0.028))
  const gap = Math.max(2, Math.round(size * 0.006))
  const cell = Math.max(1, (size - padding * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE)
  return { padding, gap, cell }
}
