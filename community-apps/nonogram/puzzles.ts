// The curated set. Every grid is drawn for this app and checked by
// game.test.ts to have exactly one solution, so a shipped puzzle is always a
// logic puzzle, never a guess at the intended picture.
import type { Grid, Puzzle } from './game.ts'
import { toGrid } from './game.ts'

export const PUZZLES: Puzzle[] = [
  {
    id: 'heart',
    name: 'Heart',
    tier: 'Easy',
    rows: ['##.##', '#####', '.###.', '..#..', '..#..']
  },
  {
    id: 'umbrella',
    name: 'Umbrella',
    tier: 'Easy',
    rows: ['.###.', '#####', '..#..', '..#..', '.##..']
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    tier: 'Easy',
    rows: ['.###.', '#####', '.#.#.', '.#.#.', '.###.']
  },
  {
    id: 'rocket',
    name: 'Rocket',
    tier: 'Easy',
    rows: ['..#..', '.###.', '#####', '#####', '#.#.#']
  },
  {
    id: 'tree',
    name: 'Tree',
    tier: 'Easy',
    rows: ['..#..', '.###.', '#####', '..#..', '.###.']
  },
  {
    id: 'boat',
    name: 'Sailboat',
    tier: 'Medium',
    rows: [
      '....#.....',
      '....##....',
      '....###...',
      '....#.....',
      '....#.....',
      '....#.....',
      '.#########',
      '..#######.',
      '...#####..',
      '....###...'
    ]
  },
  {
    id: 'invader',
    name: 'Invader',
    tier: 'Medium',
    rows: [
      '..#....#..',
      '...#..#...',
      '..######..',
      '.##.##.##.',
      '##########',
      '#.######.#',
      '#.#....#.#',
      '...##.##..',
      '..........',
      '..........'
    ]
  },
  {
    id: 'house',
    name: 'House',
    tier: 'Medium',
    rows: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '##########',
      '.#.#..#.#.',
      '.#.####.#.',
      '.#.#..#.#.',
      '.#.####.#.',
      '.########.'
    ]
  },
  {
    id: 'flower',
    name: 'Flower',
    tier: 'Tricky',
    rows: [
      '...###....',
      '..#####...',
      '..##.##...',
      '..#####...',
      '...###....',
      '....#.....',
      '##..#..##.',
      '#####.###.',
      '..##.##...',
      '....#.....'
    ]
  },
  {
    id: 'note',
    name: 'Music note',
    tier: 'Tricky',
    rows: [
      '......####',
      '......#..#',
      '......#..#',
      '......#...',
      '......#...',
      '....###...',
      '...#####..',
      '...#####..',
      '..#####...',
      '..###.....'
    ]
  }
]

export const BY_ID = new Map(PUZZLES.map((p) => [p.id, p]))
const grids = new Map<string, Grid>()
export function gridFor(puzzle: Puzzle): Grid {
  let grid = grids.get(puzzle.id)
  if (!grid) {
    grid = toGrid(puzzle)
    grids.set(puzzle.id, grid)
  }
  return grid
}
