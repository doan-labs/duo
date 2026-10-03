import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { animations, Button, Checkbox, IconButton, Push, Sym, useWide } from '@doan-labs/duo-uikit'
import { dark, delay, shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from './editor.tsx'
import {
  blankDraft,
  clampProgress,
  draftFrom,
  dropProgress,
  parseProgress,
  parseRecipes,
  parseView,
  progressFor,
  type Recipe,
  recipeFrom,
  removeRecipe,
  rowKeys,
  serializeProgress,
  serializeRecipes,
  serializeView,
  setCookStep,
  toggleIngredient,
  upsertRecipe,
  type View
} from './recipes.ts'
import { styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a view not written by this copy is always the newer
// settled screen - adopting it unconditionally is what converges the two
// displays, including the race where both seed an empty session at once.
const ME = crypto.randomUUID()

const GLYPHS = ['fork', 'cup', 'leaf', 'cart', 'book', 'heart'] as const
const TINTS = [colors.orange, colors.green, colors.teal, colors.indigo, colors.pink, colors.brown]

// A stable per-recipe look derived from its id: the same recipe keeps the same
// tile on both displays and across sessions.
const tileIndex = (id: string) => {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % GLYPHS.length
}

function Tile({ id, big }: { id: string; big?: boolean }) {
  const index = tileIndex(id)
  return (
    <span {...stylex.props(styles.tile, big && styles.tileBig, styles.tileTint(TINTS[index]!))}>
      <Sym name={GLYPHS[index]!} size={big ? 28 : 22} />
    </span>
  )
}

function RecipeBox() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const recipesKV = useKV(os.storage, 'recipes')
  const progressKV = useKV(os.storage, 'progress')
  const session = useKV(os.session, 'view')
  const [view, setView] = useState<View>({ screen: 'list' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)

  const recipes = parseRecipes(recipesKV.value)
  const progress = parseProgress(progressKV.value)

  // Why the ref + stable callback: `useKV` returns a fresh `set` each render,
  // so keying `publish` on it would resubscribe the session effect on every
  // keystroke. The ref always points at the live KV mirror.
  const sessionRef = useRef(session)
  sessionRef.current = session
  const publish = useCallback((next: View) => {
    setView(next)
    sessionRef.current.set(serializeView(ME, next))
  }, [])

  // Why adopt on the session key: the fold carries the open recipe, the cooking
  // step and even a half-written draft to the other display. A write this copy
  // did not make is the newer settled view; own writes are already on screen
  // and are ignored. The raw string is the guard: the effect body must not
  // re-fire on every render of a remote value already adopted.
  useEffect(() => {
    if (session.status === 'hydrating' || session.status === 'saving') return
    const raw = session.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current) {
        seeded.current = true
        sessionRef.current.set(serializeView(ME, { screen: 'list' }))
      }
      return
    }
    const next = parseView(raw)
    if (!next || next.by === ME) return
    setConfirmDelete(false)
    setView(next.view)
  }, [session.value, session.status])

  // A recipe removed on the other display cannot keep its detail or cook view
  // open here; only settle this once storage has hydrated, or a cold open would
  // bounce straight back to the list before the recipes arrive.
  useEffect(() => {
    if (recipesKV.status !== 'ready') return
    if (view.screen === 'detail' || view.screen === 'cook') {
      if (!recipes.some((recipe) => recipe.id === view.recipeId)) publish({ screen: 'list' })
    }
  }, [recipesKV.status, recipes, view, publish])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const writeRecipes = (next: Recipe[]) => void recipesKV.set(serializeRecipes(next))
  const writeProgress = (next: ReturnType<typeof parseProgress>) => void progressKV.set(serializeProgress(next))

  const openList = () => publish({ screen: 'list' })
  const openRecipe = (id: string) => publish({ screen: 'detail', recipeId: id })
  const openCook = (id: string) => publish({ screen: 'cook', recipeId: id })
  const openNew = () => publish({ screen: 'edit', recipeId: null, draft: blankDraft() })
  const openEdit = (recipe: Recipe) => publish({ screen: 'edit', recipeId: recipe.id, draft: draftFrom(recipe) })

  const toggleCheck = (recipeId: string, index: number) => writeProgress(toggleIngredient(progress, recipeId, index))
  const jumpStep = (recipeId: string, step: number, total: number) =>
    writeProgress(setCookStep(progress, recipeId, step, total))

  const deleteRecipe = (id: string) => {
    writeRecipes(removeRecipe(recipes, id))
    writeProgress(dropProgress(progress, id))
    publish({ screen: 'list' })
  }

  const saveDraft = () => {
    if (view.screen !== 'edit') return
    const recipe = recipeFrom(view.draft, view.recipeId ?? crypto.randomUUID())
    if (!recipe.name || !recipe.ingredients.length || !recipe.steps.length) return
    writeRecipes(upsertRecipe(recipes, recipe))
    writeProgress(clampProgress(progress, recipe))
    publish({ screen: 'detail', recipeId: recipe.id })
  }

  const ingredientsPanel = (recipe: Recipe) => {
    const state = progressFor(progress, recipe.id)
    return (
      <section {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.panelLabel)}>
          <span>Ingredients</span>
          <span>
            {state.checked.filter((index) => index < recipe.ingredients.length).length}/{recipe.ingredients.length}
          </span>
        </div>
        <ul {...stylex.props(styles.rows)}>
          {rowKeys(recipe.ingredients).map((rowKey, index) => {
            const line = recipe.ingredients[index]!
            const checked = state.checked.includes(index)
            const boxId = `ing-${recipe.id}-${index}`
            return (
              <li key={rowKey} {...stylex.props(styles.row, shared.select)}>
                <label htmlFor={boxId} {...stylex.props(styles.rowLabel)}>
                  <Checkbox
                    id={boxId}
                    tint={colors.orangeDark}
                    checked={checked}
                    onChange={() => toggleCheck(recipe.id, index)}
                    aria-label={line}
                    xstyle={checked ? styles.tickDone : undefined}
                  />
                  <span {...stylex.props(styles.checkText, checked && styles.checkDone)}>{line}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const stepsPanel = (recipe: Recipe, current: number | null) => {
    const interactive = current !== null
    return (
      <section {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.panelLabel)}>
          <span>Steps</span>
          <span>{recipe.steps.length}</span>
        </div>
        <ol {...stylex.props(styles.rows)}>
          {rowKeys(recipe.steps).map((rowKey, index) => {
            const line = recipe.steps[index]!
            const here = index === current
            const row = (
              <>
                <span {...stylex.props(styles.stepNum, here && styles.stepNumNow)}>{index + 1}</span>
                <span
                  {...stylex.props(
                    styles.stepText,
                    here && styles.stepTextNow,
                    current !== null && index < current && styles.stepPast
                  )}
                >
                  {line}
                </span>
              </>
            )
            return (
              <li key={rowKey} {...stylex.props(styles.row, interactive && shared.select, here && styles.stepNow)}>
                {interactive ? (
                  <button
                    type="button"
                    aria-current={here ? 'step' : undefined}
                    onClick={() => jumpStep(recipe.id, index, recipe.steps.length)}
                    {...stylex.props(styles.rowButton)}
                  >
                    {row}
                  </button>
                ) : (
                  row
                )}
              </li>
            )
          })}
        </ol>
      </section>
    )
  }

  const listPage = (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.hdr)}>
        <div {...stylex.props(styles.hdrCopy)}>
          <span {...stylex.props(styles.kicker)}>Duo Kitchen</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Recipe Box</h1>
        </div>
        <div {...stylex.props(styles.hdrActions)}>
          <IconButton name="plus" variant="tinted" size={17} aria-label="Add recipe" onClick={openNew} />
        </div>
      </header>
      <div {...stylex.props(styles.scroll, !wide && styles.scrollCover)}>
        {recipesKV.status === 'hydrating' ? null : recipes.length === 0 ? (
          <div {...stylex.props(styles.empty)}>
            <Tile id="empty" big />
            <h2 {...stylex.props(styles.emptyTitle)}>No recipes yet</h2>
            <p {...stylex.props(styles.emptyHint)}>Save a family favourite and it waits on both displays.</p>
            <Button variant="filled" onClick={openNew}>
              Add a recipe
            </Button>
          </div>
        ) : (
          <ul {...stylex.props(styles.rows, styles.grid, wide && styles.gridWide)}>
            {recipes.map((recipe, index) => {
              const state = progressFor(progress, recipe.id)
              const cooking = state.step > 0 && recipe.steps.length > 0
              return (
                <li key={recipe.id} {...stylex.props(styles.cardCell, animations.rise, delay.ms(index * 40))}>
                  <button
                    type="button"
                    onClick={() => openRecipe(recipe.id)}
                    {...stylex.props(styles.card, shared.press)}
                  >
                    <Tile id={recipe.id} />
                    <span {...stylex.props(styles.cardCopy)}>
                      <strong {...stylex.props(styles.cardName)}>{recipe.name}</strong>
                      {recipe.note ? <small {...stylex.props(styles.cardNote)}>{recipe.note}</small> : null}
                      <span {...stylex.props(styles.cardMeta)}>
                        {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
                        {cooking && (
                          <span {...stylex.props(styles.chip, styles.chipHot)}>On step {state.step + 1}</span>
                        )}
                      </span>
                    </span>
                    <span {...stylex.props(styles.cardChevron)}>
                      <Sym name="forward" size={13} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <small role="status" {...stylex.props(styles.saved)}>
          {recipesKV.status === 'saving' || progressKV.status === 'saving' ? 'Saving...' : 'Kept on this Duo'}
        </small>
      </div>
    </div>
  )

  const detailPage = (recipe: Recipe) => {
    const state = progressFor(progress, recipe.id)
    const cooking = state.step > 0
    return (
      <div {...stylex.props(styles.page, shared.swap)} key={`detail-${recipe.id}`}>
        <header {...stylex.props(styles.hdr)}>
          <IconButton name="back" variant="plain" aria-label="Back" onClick={openList} />
          <h1 {...stylex.props(styles.pageTitle)}>{recipe.name}</h1>
          <div {...stylex.props(styles.hdrActions)}>
            <IconButton
              name="compose"
              variant="plain"
              size={17}
              aria-label="Edit recipe"
              onClick={() => openEdit(recipe)}
            />
            <IconButton
              name="trash"
              variant="plain"
              size={16}
              aria-label="Delete recipe"
              onClick={() => setConfirmDelete(true)}
            />
          </div>
        </header>
        <div {...stylex.props(styles.scroll, !wide && styles.scrollCover)}>
          {confirmDelete && (
            <section {...stylex.props(styles.hero)}>
              <p {...stylex.props(styles.heroNote)}>
                Delete {recipe.name}? The recipe and its cooking progress go with it.
              </p>
              <div {...stylex.props(styles.actions)}>
                <Button variant="plain" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
                <div {...stylex.props(styles.actionGrow)}>
                  <Button variant="filled" xstyle={styles.saveButton} onClick={() => deleteRecipe(recipe.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </section>
          )}
          <section {...stylex.props(styles.hero, animations.rise)}>
            <div {...stylex.props(styles.heroTop)}>
              <Tile id={recipe.id} big />
              <div {...stylex.props(styles.cardCopy)}>
                <h2 {...stylex.props(styles.heroName)}>{recipe.name}</h2>
                {recipe.note ? <p {...stylex.props(styles.heroNote)}>{recipe.note}</p> : null}
              </div>
            </div>
            <div {...stylex.props(styles.chips)}>
              <span {...stylex.props(styles.chip)}>{recipe.ingredients.length} ingredients</span>
              <span {...stylex.props(styles.chip)}>{recipe.steps.length} steps</span>
              {cooking && (
                <span {...stylex.props(styles.chip, styles.chipHot)}>
                  On step {state.step + 1} of {recipe.steps.length}
                </span>
              )}
            </div>
            <Button variant="filled" onClick={() => openCook(recipe.id)}>
              {cooking ? 'Resume cooking' : 'Start cooking'}
            </Button>
          </section>
          <div {...stylex.props(styles.columns, wide && styles.columnsWide)}>
            <div {...stylex.props(styles.column)}>{ingredientsPanel(recipe)}</div>
            <div {...stylex.props(styles.column)}>{stepsPanel(recipe, null)}</div>
          </div>
        </div>
      </div>
    )
  }

  const cookPage = (recipe: Recipe) => {
    const total = recipe.steps.length
    if (total === 0) {
      return (
        <div {...stylex.props(styles.page, shared.swap)}>
          <header {...stylex.props(styles.hdr)}>
            <IconButton name="back" variant="plain" aria-label="Back" onClick={() => openRecipe(recipe.id)} />
            <h1 {...stylex.props(styles.pageTitle)}>Cooking</h1>
          </header>
          <div {...stylex.props(styles.scroll)}>
            <div {...stylex.props(styles.empty)}>
              <p {...stylex.props(styles.emptyHint)}>No steps yet - open the editor to write the first one.</p>
            </div>
          </div>
        </div>
      )
    }
    const step = Math.min(progressFor(progress, recipe.id).step, Math.max(0, total - 1))
    const last = step >= total - 1
    const finish = () => {
      jumpStep(recipe.id, 0, total)
      openRecipe(recipe.id)
    }
    return (
      <div {...stylex.props(styles.page, shared.swap)} key={`cook-${recipe.id}`}>
        <header {...stylex.props(styles.hdr)}>
          <IconButton name="back" variant="plain" aria-label="Back" onClick={() => openRecipe(recipe.id)} />
          <h1 {...stylex.props(styles.pageTitle)}>Cooking</h1>
          <div {...stylex.props(styles.hdrActions)}>
            <span {...stylex.props(styles.cookMeta)}>{recipe.name}</span>
          </div>
        </header>
        <div {...stylex.props(styles.scroll, !wide && styles.scrollCover)}>
          <section {...stylex.props(styles.cookCard)}>
            <span {...stylex.props(styles.cookKicker)}>
              Step {step + 1} of {total}
            </span>
            <p key={step} {...stylex.props(styles.cookText, !wide && styles.cookTextCover)}>
              {recipe.steps[step]}
            </p>
            <div
              role="progressbar"
              aria-label="Cooking progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={step + 1}
              {...stylex.props(styles.timeline)}
            >
              <div {...stylex.props(styles.timelineFill(((step + 1) / total) * 100))} />
            </div>
            <div {...stylex.props(styles.cookControls)}>
              <IconButton
                name="back"
                variant="tinted"
                size={17}
                aria-label="Previous step"
                disabled={step === 0}
                onClick={() => jumpStep(recipe.id, step - 1, total)}
              />
              <div {...stylex.props(styles.actionGrow)}>
                <Button
                  variant="filled"
                  xstyle={styles.saveButton}
                  onClick={last ? finish : () => jumpStep(recipe.id, step + 1, total)}
                >
                  {last ? 'Done' : 'Next step'}
                </Button>
              </div>
            </div>
          </section>
          <div {...stylex.props(styles.columns, wide && styles.columnsWide)}>
            <div {...stylex.props(styles.column)}>{ingredientsPanel(recipe)}</div>
            <div {...stylex.props(styles.column)}>{stepsPanel(recipe, step)}</div>
          </div>
        </div>
      </div>
    )
  }

  const missingPage = (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.hdr)}>
        <IconButton name="back" variant="plain" aria-label="Back" onClick={openList} />
        <h1 {...stylex.props(styles.pageTitle)}>Recipe Box</h1>
      </header>
      <div {...stylex.props(styles.scroll)}>
        <div {...stylex.props(styles.empty)}>
          <p {...stylex.props(styles.emptyHint)}>That recipe is gone. The list is one tap back.</p>
        </div>
      </div>
    </div>
  )

  // The sheet keeps rendering its last content while it slides out, so a fold
  // home never flashes an empty card.
  const lastSheet = useRef<View>({ screen: 'list' })
  if (view.screen !== 'list') lastSheet.current = view
  const shown = view.screen === 'list' ? lastSheet.current : view

  const sheet =
    shown.screen === 'edit' ? (
      <Editor
        draft={shown.draft}
        recipeId={shown.recipeId}
        wide={wide}
        onDraft={(draft) => publish({ ...shown, draft })}
        onSave={saveDraft}
        onCancel={() => publish(shown.recipeId ? { screen: 'detail', recipeId: shown.recipeId } : { screen: 'list' })}
        onDelete={shown.recipeId ? () => deleteRecipe(shown.recipeId!) : undefined}
      />
    ) : shown.screen === 'detail' || shown.screen === 'cook' ? (
      (() => {
        const recipe = recipes.find((item) => item.id === shown.recipeId)
        if (!recipe) return missingPage
        return shown.screen === 'cook' ? cookPage(recipe) : detailPage(recipe)
      })()
    ) : (
      <div {...stylex.props(styles.page)} />
    )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root)}>
      <Push open={view.screen !== 'list'} sheet={sheet}>
        {listPage}
      </Push>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<RecipeBox />)
