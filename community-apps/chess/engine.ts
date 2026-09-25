// Chess rules: a complete legal-move engine on a 0x64 board. `sq = rank * 8 +
// file`, rank 0 is White's back rank, file 0 is the a-file, so e1 is 4 and e8
// is 60. White pieces are uppercase, black lowercase. Positions are immutable:
// `apply` returns a fresh one, which keeps React state and the bot's search on
// the same code path without a separate unmake.
export type Color = 'w' | 'b'
export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type Promo = 'q' | 'r' | 'b' | 'n'
export type Move = {
  from: number
  to: number
  promo?: Promo
  /** En-passant capture. */
  ep?: true
  /** Pawn double push: sets the ep square. */
  double?: true
  castle?: 'K' | 'Q' | 'k' | 'q'
}
export type Position = {
  board: (Piece | null)[]
  turn: Color
  /**Subset of 'KQkq'. */
  castling: string
  ep: number | null
  halfmove: number
  fullmove: number
}

export const WHITE: Color = 'w'
export const BLACK: Color = 'b'

export const file = (sq: number) => sq & 7
export const rank = (sq: number) => sq >> 3
export const square = (f: number, r: number) => r * 8 + f
export const squareName = (sq: number) => `${'abcdefgh'[file(sq)]}${rank(sq) + 1}`
export const parseSquare = (name: string) => square(name.charCodeAt(0) - 97, name.charCodeAt(1) - 49)

export const colorOf = (p: Piece): Color => (p === p.toUpperCase() ? WHITE : BLACK)
export const other = (c: Color): Color => (c === WHITE ? BLACK : WHITE)
const isPiece = (p: Piece | null | undefined): p is Piece => p != null

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function fromFEN(fen: string): Position {
  const [rows, turn, castling, ep, halfmove, fullmove] = fen.split(' ')
  const board: (Piece | null)[] = Array(64).fill(null)
  rows!.split('/').forEach((row, i) => {
    let f = 0
    for (const ch of row!) {
      if (/\d/.test(ch)) f += Number(ch)
      else {
        board[square(f, 7 - i)] = ch as Piece
        f++
      }
    }
  })
  return {
    board,
    turn: (turn ?? 'w') as Color,
    castling: castling ?? '',
    ep: ep && ep !== '-' ? parseSquare(ep) : null,
    halfmove: Number(halfmove ?? 0),
    fullmove: Number(fullmove ?? 1)
  }
}

export function toFEN(p: Position): string {
  const rows: string[] = []
  for (let r = 7; r >= 0; r--) {
    let row = ''
    let empty = 0
    for (let f = 0; f < 8; f++) {
      const piece = p.board[square(f, r)]
      if (piece) {
        if (empty) row += empty
        empty = 0
        row += piece
      } else empty++
    }
    if (empty) row += empty
    rows.push(row)
  }
  return `${rows.join('/')} ${p.turn} ${p.castling || '-'} ${p.ep === null ? '-' : squareName(p.ep)} ${p.halfmove} ${p.fullmove}`
}

export const startPosition = () => fromFEN(START_FEN)

const KNIGHT_STEPS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2]
] as const
const KING_STEPS = [
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1]
] as const
const ROOK_RAYS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const
const BISHOP_RAYS = [
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1]
] as const

/** Is `sq` attacked by any piece of colour `by`? */
export function isAttacked(board: (Piece | null)[], sq: number, by: Color): boolean {
  const f = file(sq)
  const r = rank(sq)
  // Pawns: a white pawn sits one rank below its targets, a black one above.
  const pawn = by === WHITE ? 'P' : 'p'
  const pr = by === WHITE ? r - 1 : r + 1
  if (pr >= 0 && pr < 8) {
    if (f > 0 && board[square(f - 1, pr)] === pawn) return true
    if (f < 7 && board[square(f + 1, pr)] === pawn) return true
  }
  const knight = by === WHITE ? 'N' : 'n'
  for (const [df, dr] of KNIGHT_STEPS) {
    const nf = f + df
    const nr = r + dr
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8 && board[square(nf, nr)] === knight) return true
  }
  const king = by === WHITE ? 'K' : 'k'
  for (const [df, dr] of KING_STEPS) {
    const nf = f + df
    const nr = r + dr
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8 && board[square(nf, nr)] === king) return true
  }
  const slide = (rays: readonly (readonly [number, number])[], pieces: string) => {
    for (const [df, dr] of rays) {
      let nf = f + df
      let nr = r + dr
      while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        const p = board[square(nf, nr)]
        if (p) {
          if (colorOf(p) === by && pieces.includes(p.toLowerCase())) return true
          break
        }
        nf += df
        nr += dr
      }
    }
    return false
  }
  return slide(ROOK_RAYS, 'rq') || slide(BISHOP_RAYS, 'bq')
}

const PROMOS: Promo[] = ['q', 'r', 'b', 'n']

function pseudoMoves(p: Position): Move[] {
  const moves: Move[] = []
  const { board, turn } = p
  const up = turn === WHITE ? 1 : -1
  const pawnStart = turn === WHITE ? 1 : 6
  const lastRank = turn === WHITE ? 7 : 0
  const pushPawn = (from: number, to: number, extra: Partial<Move> = {}) => {
    if (rank(to) === lastRank) for (const promo of PROMOS) moves.push({ from, to, promo, ...extra })
    else moves.push({ from, to, ...extra })
  }
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq]
    if (!isPiece(piece) || colorOf(piece) !== turn) continue
    const f = file(sq)
    const r = rank(sq)
    switch (piece.toLowerCase()) {
      case 'p': {
        const one = square(f, r + up)
        if (!board[one]) {
          pushPawn(sq, one)
          const two = square(f, r + up * 2)
          if (r === pawnStart && !board[two]) moves.push({ from: sq, to: two, double: true })
        }
        for (const df of [-1, 1]) {
          const nf = f + df
          if (nf < 0 || nf > 7) continue
          const to = square(nf, r + up)
          const target = board[to]
          if (target && colorOf(target) !== turn) pushPawn(sq, to)
          if (p.ep === to) moves.push({ from: sq, to, ep: true })
        }
        break
      }
      case 'n':
      case 'k': {
        const steps = piece.toLowerCase() === 'n' ? KNIGHT_STEPS : KING_STEPS
        for (const [df, dr] of steps) {
          const nf = f + df
          const nr = r + dr
          if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue
          const to = square(nf, nr)
          const target = board[to]
          if (!target || colorOf(target) !== turn) moves.push({ from: sq, to })
        }
        break
      }
      default: {
        const rays =
          piece.toLowerCase() === 'r'
            ? ROOK_RAYS
            : piece.toLowerCase() === 'b'
              ? BISHOP_RAYS
              : [...ROOK_RAYS, ...BISHOP_RAYS]
        for (const [df, dr] of rays) {
          let nf = f + df
          let nr = r + dr
          while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const to = square(nf, nr)
            const target = board[to]
            if (target) {
              if (colorOf(target) !== turn) moves.push({ from: sq, to })
              break
            }
            moves.push({ from: sq, to })
            nf += df
            nr += dr
          }
        }
      }
    }
  }
  // Castling: squares empty between king and rook, and the king's path clear
  // of attack - e, then the square it crosses, then the one it lands on.
  const castle = (side: 'K' | 'Q' | 'k' | 'q', home: number, between: number[], path: number[]) => {
    if (!p.castling.includes(side)) return
    if (board[home] !== (turn === WHITE ? 'K' : 'k')) return
    if (between.some((sq) => board[sq])) return
    if (path.some((sq) => isAttacked(board, sq, other(turn)))) return
    moves.push({ from: home, to: side === 'K' || side === 'k' ? home + 2 : home - 2, castle: side })
  }
  if (turn === WHITE) {
    castle('K', 4, [5, 6], [4, 5, 6])
    castle('Q', 4, [1, 2, 3], [4, 3, 2])
  } else {
    castle('k', 60, [61, 62], [60, 61, 62])
    castle('q', 60, [57, 58, 59], [60, 59, 58])
  }
  return moves
}

export function apply(p: Position, m: Move): Position {
  const board = p.board.slice()
  const piece = board[m.from]!
  const turn = colorOf(piece)
  board[m.from] = null
  if (m.ep) board[m.to + (turn === WHITE ? -8 : 8)] = null
  board[m.to] = m.promo ? ((turn === WHITE ? m.promo.toUpperCase() : m.promo) as Piece) : piece
  if (m.castle) {
    const r = turn === WHITE ? 0 : 7
    if (m.to === square(6, r)) {
      board[square(5, r)] = board[square(7, r)] ?? null
      board[square(7, r)] = null
    } else {
      board[square(3, r)] = board[square(0, r)] ?? null
      board[square(0, r)] = null
    }
  }
  // Rights die with the king's move, with a rook leaving its corner, and with
  // a rook being captured on its corner.
  let castling = p.castling
  const drop = (sq: number) => {
    castling = castling.replace('KQkq'[sq === 7 ? 0 : sq === 0 ? 1 : sq === 63 ? 2 : 3]!, '')
  }
  if (piece === 'K') castling = castling.replace('K', '').replace('Q', '')
  if (piece === 'k') castling = castling.replace('k', '').replace('q', '')
  if ([0, 7, 56, 63].includes(m.from)) drop(m.from)
  if ([0, 7, 56, 63].includes(m.to)) drop(m.to)
  const captured = m.ep || p.board[m.to] !== null
  return {
    board,
    turn: other(turn),
    castling,
    ep: m.double ? m.from + (turn === WHITE ? 8 : -8) : null,
    halfmove: piece.toLowerCase() === 'p' || captured ? 0 : p.halfmove + 1,
    fullmove: p.fullmove + (turn === BLACK ? 1 : 0)
  }
}

export function kingSquare(board: (Piece | null)[], color: Color): number {
  const king = color === WHITE ? 'K' : 'k'
  for (let sq = 0; sq < 64; sq++) if (board[sq] === king) return sq
  return -1
}

export const inCheck = (p: Position, color: Color = p.turn) =>
  isAttacked(p.board, kingSquare(p.board, color), other(color))

export function legalMoves(p: Position): Move[] {
  const out: Move[] = []
  for (const m of pseudoMoves(p)) {
    const next = apply(p, m)
    if (!isAttacked(next.board, kingSquare(next.board, p.turn), next.turn)) out.push(m)
  }
  return out
}

export type GameStatus =
  | { state: 'playing' }
  | { state: 'checkmate'; loser: Color }
  | { state: 'stalemate' }
  | { state: 'draw'; reason: 'fifty' | 'material' | 'repetition' }

/** Dead position: bare kings, king + minor vs king, or bishops on one colour. */
export function insufficientMaterial(board: (Piece | null)[]): boolean {
  const pieces: { p: Piece; sq: number }[] = []
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq]
    if (isPiece(p) && p.toLowerCase() !== 'k') pieces.push({ p, sq })
  }
  if (pieces.length === 0) return true
  if (pieces.length > 2) return false
  if (pieces.length === 1) return 'bn'.includes(pieces[0]!.p.toLowerCase())
  // Two pieces left: only bishop-vs-bishop on the same colour squares is dead.
  const [a, b] = pieces
  if (a!.p.toLowerCase() !== 'b' || b!.p.toLowerCase() !== 'b') return false
  return (file(a!.sq) + rank(a!.sq)) % 2 === (file(b!.sq) + rank(b!.sq)) % 2
}

/**
 * `seen` counts position keys (placement + side + rights + ep) across the
 * game's history for the threefold rule; inside the bot's own search it is
 * left out, the same simplification small engines make.
 */
export function statusOf(p: Position, seen: Record<string, number> = {}): GameStatus {
  if (legalMoves(p).length === 0) return inCheck(p) ? { state: 'checkmate', loser: p.turn } : { state: 'stalemate' }
  if (p.halfmove >= 100) return { state: 'draw', reason: 'fifty' }
  if (insufficientMaterial(p.board)) return { state: 'draw', reason: 'material' }
  const key = positionKey(p)
  if ((seen[key] ?? 0) + 1 >= 3) return { state: 'draw', reason: 'repetition' }
  return { state: 'playing' }
}

export const positionKey = (p: Position) => `${toFEN(p).split(' ').slice(0, 4).join(' ')}`

const PIECE_LETTER: Record<string, string> = { n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' }

/** Standard algebraic notation for one move in a known position. */
export function toSAN(p: Position, m: Move): string {
  const piece = p.board[m.from]!
  const capture = Boolean(m.ep) || p.board[m.to] !== null
  let san: string
  if (m.castle === 'K' || m.castle === 'k') san = 'O-O'
  else if (m.castle === 'Q' || m.castle === 'q') san = 'O-O-O'
  else {
    let head = ''
    if (piece.toLowerCase() === 'p') {
      if (capture) head = 'abcdefgh'[file(m.from)]!
    } else {
      head = PIECE_LETTER[piece.toLowerCase()]!
      // Disambiguate only when a same-type piece could legally land on `to`.
      const rivals = legalMoves(p).filter((o) => o.to === m.to && o.from !== m.from && p.board[o.from] === piece)
      if (rivals.length) {
        const sameFile = rivals.some((o) => file(o.from) === file(m.from))
        const sameRank = rivals.some((o) => rank(o.from) === rank(m.from))
        head += sameFile ? (sameRank ? squareName(m.from) : String(rank(m.from) + 1)) : 'abcdefgh'[file(m.from)]!
      }
    }
    san = `${head}${capture ? 'x' : ''}${squareName(m.to)}${m.promo ? `=${m.promo.toUpperCase()}` : ''}`
  }
  const next = apply(p, m)
  if (inCheck(next)) san += legalMoves(next).length ? '+' : '#'
  return san
}

/** A move's stable wire form: 'e2e4', 'e7e8q'. Round-trips through `fromLAN`. */
export const toLAN = (m: Move) => `${squareName(m.from)}${squareName(m.to)}${m.promo ?? ''}`

/** Find the legal move a LAN string names in `p`, or null if it isn't legal. */
export function fromLAN(p: Position, lan: string): Move | null {
  const from = parseSquare(lan.slice(0, 2))
  const to = parseSquare(lan.slice(2, 4))
  const promo = lan[4] as Promo | undefined
  return legalMoves(p).find((m) => m.from === from && m.to === to && m.promo === promo) ?? null
}
