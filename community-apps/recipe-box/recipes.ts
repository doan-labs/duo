export type Recipe = {
  id: string
  name: string
  note: string
  ingredients: string[]
  steps: string[]
}

// Draft rows carry their own keys so an edited line keeps its React identity
// (and its focus) while the text changes under it.
export type DraftLine = { key: string; text: string }

export type Draft = {
  name: string
  note: string
  ingredients: DraftLine[]
  steps: DraftLine[]
}

// The sheet over the recipe list: 'detail' is its hub, 'cook' and 'edit' swap
// in place so a fold mid-recipe or mid-edit lands the other copy on the same
// screen rather than back on the list.
export type View =
  | { screen: 'list' }
  | { screen: 'detail' | 'cook'; recipeId: string }
  | { screen: 'edit'; recipeId: string | null; draft: Draft }

// Per-recipe cooking state, durable in os.storage: which ingredients are
// checked off and which step the cook is on, so a paused session resumes.
export type Progress = { checked: number[]; step: number }
export type ProgressMap = Record<string, Progress>

// The session wire format: `by` lets a copy ignore its own writes, and the
// whole view is one JSON blob so a remote write is the newer settled screen.
export type Wire = { by: string; view: View }

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

const SAMPLES: Recipe[] = [
  {
    id: 'sample-lemon-pasta',
    name: 'Lemon Herb Pasta',
    note: 'Bright weeknight dinner',
    ingredients: [
      '200 g spaghetti',
      '1 lemon, zested and juiced',
      '2 garlic cloves, thinly sliced',
      '3 tbsp olive oil',
      '40 g parmesan, grated',
      'Small handful of parsley, chopped',
      'Pinch of chilli flakes'
    ],
    steps: [
      'Boil the spaghetti in well-salted water until just shy of al dente. Save a cup of pasta water.',
      'Warm the olive oil in a wide pan and soften the garlic with the chilli flakes for a minute.',
      'Add the pasta with a splash of pasta water and toss until glossy.',
      'Take off the heat, add the lemon zest, juice and parmesan, toss again and finish with parsley.'
    ]
  },
  {
    id: 'sample-golden-pancakes',
    name: 'Golden Pancakes',
    note: 'Weekend stack with crisp edges',
    ingredients: [
      '150 g plain flour',
      '1 tbsp sugar',
      '2 tsp baking powder',
      '1 egg',
      '180 ml milk',
      '25 g butter, melted',
      'Maple syrup and berries, to serve'
    ],
    steps: [
      'Whisk the flour, sugar and baking powder together in a large bowl.',
      'Whisk in the egg, milk and melted butter until just combined; a few lumps are fine.',
      'Rest the batter for five minutes while a pan warms over medium heat.',
      'Ladle small rounds and flip once bubbles cover the surface, about two minutes a side.',
      'Serve warm with maple syrup and berries.'
    ]
  }
]

// Samples stand in only while nothing has ever been written: the moment the
// cook adds, edits or deletes, storage holds a real list, and an empty one
// stays empty instead of resurrecting the samples.
export function parseRecipes(value: string | null): Recipe[] {
  if (value === null) return SAMPLES
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    const recipes: Recipe[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue
      const recipe = item as Partial<Recipe>
      if (typeof recipe.id !== 'string' || typeof recipe.name !== 'string') continue
      recipes.push({
        id: recipe.id,
        name: recipe.name,
        note: text(recipe.note),
        ingredients: strings(recipe.ingredients),
        steps: strings(recipe.steps)
      })
    }
    return recipes
  } catch {
    return []
  }
}

export function serializeRecipes(recipes: Recipe[]) {
  return JSON.stringify(recipes)
}

export function upsertRecipe(recipes: Recipe[], recipe: Recipe): Recipe[] {
  const index = recipes.findIndex((item) => item.id === recipe.id)
  if (index < 0) return [...recipes, recipe]
  return recipes.map((item) => (item.id === recipe.id ? recipe : item))
}

export function removeRecipe(recipes: Recipe[], id: string): Recipe[] {
  return recipes.filter((recipe) => recipe.id !== id)
}

export function parseProgress(value: string | null): ProgressMap {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const map: ProgressMap = {}
    for (const [id, entry] of Object.entries(parsed as Record<string, Partial<Progress>>)) {
      if (typeof entry !== 'object' || entry === null) continue
      map[id] = {
        checked: Array.isArray(entry.checked)
          ? entry.checked.filter((index): index is number => Number.isInteger(index) && index >= 0)
          : [],
        step: Number.isInteger(entry.step) && (entry.step as number) >= 0 ? (entry.step as number) : 0
      }
    }
    return map
  } catch {
    return {}
  }
}

export function serializeProgress(map: ProgressMap) {
  return JSON.stringify(map)
}

export function progressFor(map: ProgressMap, id: string): Progress {
  return map[id] ?? { checked: [], step: 0 }
}

export function toggleIngredient(map: ProgressMap, id: string, index: number): ProgressMap {
  const current = progressFor(map, id)
  const checked = current.checked.includes(index)
    ? current.checked.filter((item) => item !== index)
    : [...current.checked, index]
  return { ...map, [id]: { ...current, checked } }
}

export function setCookStep(map: ProgressMap, id: string, step: number, total: number): ProgressMap {
  const current = progressFor(map, id)
  const clamped = Math.min(Math.max(0, step), Math.max(0, total - 1))
  return { ...map, [id]: { ...current, step: clamped } }
}

export function dropProgress(map: ProgressMap, id: string): ProgressMap {
  const next = { ...map }
  delete next[id]
  return next
}

// After an edit reshapes a recipe, checked rows and the saved step can point
// past the new lists; clamp both instead of dropping the cook's place.
export function clampProgress(map: ProgressMap, recipe: Recipe): ProgressMap {
  const current = map[recipe.id]
  if (!current) return map
  const checked = current.checked.filter((index) => index < recipe.ingredients.length)
  const step = Math.min(current.step, Math.max(0, recipe.steps.length - 1))
  return { ...map, [recipe.id]: { checked, step } }
}

export function blankDraft(): Draft {
  const row = () => ({ key: crypto.randomUUID(), text: '' })
  return { name: '', note: '', ingredients: [row()], steps: [row()] }
}

export function draftFrom(recipe: Recipe): Draft {
  const row = (text: string) => ({ key: crypto.randomUUID(), text })
  return {
    name: recipe.name,
    note: recipe.note,
    ingredients: recipe.ingredients.map(row),
    steps: recipe.steps.map(row)
  }
}

export function draftValid(draft: Draft): boolean {
  return (
    draft.name.trim().length > 0 &&
    draft.ingredients.some((line) => line.text.trim().length > 0) &&
    draft.steps.some((line) => line.text.trim().length > 0)
  )
}

export function recipeFrom(draft: Draft, id: string): Recipe {
  const trim = (lines: DraftLine[]) => lines.map((line) => line.text.trim()).filter((line) => line.length > 0)
  return {
    id,
    name: draft.name.trim(),
    note: draft.note.trim(),
    ingredients: trim(draft.ingredients),
    steps: trim(draft.steps)
  }
}

// Equal text rows still need distinct React keys; the occurrence suffix keeps
// them stable across re-renders and single-row removals.
export function rowKeys(lines: string[]): string[] {
  const seen = new Map<string, number>()
  return lines.map((line) => {
    const count = seen.get(line) ?? 0
    seen.set(line, count + 1)
    return `${line}\n${count}`
  })
}

export function serializeView(by: string, view: View) {
  return JSON.stringify({ by, view } satisfies Wire)
}

export function parseView(raw: string | null): Wire | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Wire>
    if (typeof parsed.by !== 'string' || typeof parsed.view !== 'object' || parsed.view === null) return null
    const view = parsed.view as Partial<View> & { screen?: string }
    switch (view.screen) {
      case 'list':
        return { by: parsed.by, view: { screen: 'list' } }
      case 'detail':
      case 'cook':
        return typeof view.recipeId === 'string'
          ? { by: parsed.by, view: { screen: view.screen, recipeId: view.recipeId } }
          : null
      case 'edit': {
        if (view.recipeId !== null && typeof view.recipeId !== 'string') return null
        const draft = (view as { draft?: Partial<Draft> }).draft
        if (typeof draft !== 'object' || draft === null) return null
        const lines = (value: unknown): DraftLine[] =>
          Array.isArray(value)
            ? value
                .filter((line): line is DraftLine => typeof line === 'object' && line !== null)
                .map((line) => ({ key: text(line.key), text: text(line.text) }))
            : []
        return {
          by: parsed.by,
          view: {
            screen: 'edit',
            recipeId: typeof view.recipeId === 'string' ? view.recipeId : null,
            draft: {
              name: text(draft.name),
              note: text(draft.note),
              ingredients: lines(draft.ingredients),
              steps: lines(draft.steps)
            }
          }
        }
      }
      default:
        return null
    }
  } catch {
    return null
  }
}
