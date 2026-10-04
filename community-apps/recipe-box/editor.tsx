import { Button, IconButton, TextField } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Draft } from './recipes.ts'
import { draftValid } from './recipes.ts'
import { styles } from './styles.ts'

type EditorProps = {
  draft: Draft
  recipeId: string | null
  wide: boolean
  onDraft: (draft: Draft) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}

/**
 * The recipe form. The draft itself lives in the session view above, so typing
 * on one display keeps the other's copy of the form in lockstep through a fold.
 */
export function Editor({ draft, recipeId, wide, onDraft, onSave, onCancel, onDelete }: EditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const setLine = (part: 'ingredients' | 'steps', index: number, value: string) =>
    onDraft({ ...draft, [part]: draft[part].map((line, i) => (i === index ? { ...line, text: value } : line)) })
  const addLine = (part: 'ingredients' | 'steps') =>
    onDraft({ ...draft, [part]: [...draft[part], { key: crypto.randomUUID(), text: '' }] })
  const dropLine = (part: 'ingredients' | 'steps', index: number) => {
    const next = draft[part].filter((_, i) => i !== index)
    onDraft({ ...draft, [part]: next.length ? next : [{ key: crypto.randomUUID(), text: '' }] })
  }

  const ingredientRows = (
    <section {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.panelLabel)}>
        <span>Ingredients</span>
        <span>{draft.ingredients.length}</span>
      </div>
      <div {...stylex.props(styles.fieldGroup)}>
        {draft.ingredients.map((line, index) => (
          <div key={line.key} {...stylex.props(styles.fieldRow)}>
            <div {...stylex.props(styles.fieldGrow)}>
              <TextField
                aria-label={`Ingredient ${index + 1}`}
                placeholder="200 g spaghetti"
                value={line.text}
                onChange={(e) => setLine('ingredients', index, e.target.value)}
              />
            </div>
            <IconButton
              name="close"
              variant="plain"
              size={13}
              aria-label={`Remove ingredient ${index + 1}`}
              onClick={() => dropLine('ingredients', index)}
            />
          </div>
        ))}
      </div>
      <Button variant="tinted" onClick={() => addLine('ingredients')}>
        Add ingredient
      </Button>
    </section>
  )

  const stepRows = (
    <section {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.panelLabel)}>
        <span>Steps</span>
        <span>{draft.steps.length}</span>
      </div>
      <div {...stylex.props(styles.fieldGroup)}>
        {draft.steps.map((line, index) => (
          <div key={line.key} {...stylex.props(styles.fieldRow)}>
            <span {...stylex.props(styles.fieldNum)}>{index + 1}</span>
            <div {...stylex.props(styles.fieldGrow)}>
              <TextField
                multiline
                aria-label={`Step ${index + 1}`}
                placeholder="Describe this step"
                value={line.text}
                onChange={(e) => setLine('steps', index, e.target.value)}
              />
            </div>
            <IconButton
              name="close"
              variant="plain"
              size={13}
              aria-label={`Remove step ${index + 1}`}
              onClick={() => dropLine('steps', index)}
            />
          </div>
        ))}
      </div>
      <Button variant="tinted" onClick={() => addLine('steps')}>
        Add step
      </Button>
    </section>
  )

  return (
    <div {...stylex.props(styles.page, shared.swap)}>
      <header {...stylex.props(styles.hdr)}>
        <IconButton name="back" variant="plain" aria-label="Back" onClick={onCancel} />
        <h1 {...stylex.props(styles.pageTitle)}>{recipeId ? 'Edit recipe' : 'New recipe'}</h1>
      </header>
      <div {...stylex.props(styles.scroll, !wide && styles.scrollCover)}>
        <section {...stylex.props(styles.panel)}>
          <div {...stylex.props(styles.panelLabel)}>
            <span>Recipe</span>
          </div>
          <TextField
            aria-label="Recipe name"
            placeholder="Name"
            value={draft.name}
            onChange={(e) => onDraft({ ...draft, name: e.target.value })}
          />
          <TextField
            aria-label="Note"
            placeholder="A line about it - when you make it, who taught you"
            value={draft.note}
            onChange={(e) => onDraft({ ...draft, note: e.target.value })}
          />
        </section>
        <div {...stylex.props(styles.columns, wide && styles.columnsWide)}>
          <div {...stylex.props(styles.column)}>{ingredientRows}</div>
          <div {...stylex.props(styles.column)}>{stepRows}</div>
        </div>
        <div {...stylex.props(styles.actions)}>
          <Button variant="plain" onClick={onCancel}>
            Cancel
          </Button>
          <div {...stylex.props(styles.actionGrow)}>
            <Button variant="filled" xstyle={styles.saveButton} disabled={!draftValid(draft)} onClick={onSave}>
              {recipeId ? 'Save changes' : 'Save recipe'}
            </Button>
          </div>
        </div>
        {onDelete &&
          (confirmDelete ? (
            <div {...stylex.props(styles.actions)}>
              <Button variant="plain" onClick={() => setConfirmDelete(false)}>
                Keep recipe
              </Button>
              <div {...stylex.props(styles.actionGrow)}>
                <Button variant="filled" xstyle={styles.saveButton} onClick={onDelete}>
                  Delete it
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="plain" xstyle={styles.danger} onClick={() => setConfirmDelete(true)}>
              Delete this recipe
            </Button>
          ))}
      </div>
    </div>
  )
}
