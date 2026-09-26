// The two editors: a shortcut's name, icon and steps, and an automation's
// trigger, action and switch. Both are kit Sheets over the same draft cell, so
// the card survives a fold with what was typed intact.

import { Button, IconButton, Section, Select, Sheet, Text, TextField, Toggle } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import {
  closeEditor,
  deleteAutomation,
  deleteShortcut,
  type Editor,
  GO_HOME,
  ICONS,
  OPENABLE,
  patchEditor,
  SIMULATED,
  type Step,
  saveAutomation,
  saveShortcut,
  say,
  useEditor
} from './store.ts'
import { styles } from './styles.ts'

const StepRow = ({ step, onChange, onRemove }: { step: Step; onChange: (s: Step) => void; onRemove: () => void }) => (
  <div {...stylex.props(styles.step)}>
    <Select
      aria-label="Action"
      value={step.action}
      onChange={(e) => onChange({ ...step, action: e.target.value })}
      xstyle={[styles.stepSel]}
    >
      <optgroup label="Open an app">
        {OPENABLE.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </optgroup>
      <optgroup label="Other">
        <option value={GO_HOME}>{GO_HOME}</option>
        <option value={SIMULATED}>{SIMULATED}</option>
      </optgroup>
    </Select>
    {step.action === 'Safari' && (
      <TextField
        aria-label="URL"
        placeholder="URL"
        value={step.arg ?? ''}
        onChange={(e) => onChange({ ...step, arg: e.target.value })}
      />
    )}
    <IconButton name="trash" size={14} aria-label="Remove action" onClick={onRemove} />
  </div>
)

const ShortcutEditor = ({ draft }: { draft: Extract<Editor, { kind: 'shortcut' }> }) => {
  const valid = !!draft.name.trim() && draft.steps.some((s) => s.action.trim())
  const save = () => {
    if (!saveShortcut(draft)) return
    say(draft.id ? 'Shortcut updated' : 'Shortcut created')
    closeEditor()
  }
  return (
    <>
      <div {...stylex.props(styles.edHead)}>
        <Button variant="plain" onClick={closeEditor}>
          Cancel
        </Button>
        <span {...stylex.props(styles.edTitle)}>{draft.id ? 'Edit Shortcut' : 'New Shortcut'}</span>
        <Button variant="plain" onClick={save} disabled={!valid}>
          Save
        </Button>
      </div>
      <div {...stylex.props(styles.edBody)}>
        <label {...stylex.props(styles.field)} htmlFor="sc-name">
          <Text size="footnote" color="secondary" xstyle={[styles.label]}>
            Name
          </Text>
          <TextField
            id="sc-name"
            placeholder="Shortcut name"
            value={draft.name}
            onChange={(e) => patchEditor({ name: e.target.value })}
          />
        </label>
        <fieldset {...stylex.props(styles.field, styles.fieldset)}>
          <legend {...stylex.props(styles.legend)}>
            <Text size="footnote" color="secondary">
              Icon
            </Text>
          </legend>
          <div {...stylex.props(styles.icons)}>
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Icon ${i}`}
                aria-pressed={draft.icon === i}
                {...stylex.props(styles.iconPick, draft.icon === i && styles.iconOn)}
                onClick={() => patchEditor({ icon: i })}
              >
                {i}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset {...stylex.props(styles.field, styles.fieldset)}>
          <legend {...stylex.props(styles.legend)}>
            <Text size="footnote" color="secondary">
              Actions
            </Text>
          </legend>
          <div {...stylex.props(styles.steps)}>
            {draft.steps.map((s, i) => (
              <StepRow
                // Steps are an ordered draft list; index is stable here.
                // biome-ignore lint/suspicious/noArrayIndexKey: ordered draft rows
                key={i}
                step={s}
                onChange={(step) => patchEditor({ steps: draft.steps.map((o, n) => (n === i ? step : o)) })}
                onRemove={() => patchEditor({ steps: draft.steps.filter((_, n) => n !== i) })}
              />
            ))}
            <Button onClick={() => patchEditor({ steps: [...draft.steps, { action: SIMULATED }] })}>Add Action</Button>
          </div>
        </fieldset>
        {draft.id && (
          <Button
            variant="plain"
            xstyle={[styles.danger]}
            onClick={() => {
              deleteShortcut(draft.id!)
              say('Shortcut deleted')
              closeEditor()
            }}
          >
            Delete Shortcut
          </Button>
        )}
      </div>
    </>
  )
}

const AutomationEditor = ({ draft }: { draft: Extract<Editor, { kind: 'automation' }> }) => {
  const valid = !!draft.trigger.trim() && !!draft.action.trim()
  const save = () => {
    if (!saveAutomation(draft)) return
    say('Automation saved')
    closeEditor()
  }
  return (
    <>
      <div {...stylex.props(styles.edHead)}>
        <Button variant="plain" onClick={closeEditor}>
          Cancel
        </Button>
        <span {...stylex.props(styles.edTitle)}>Automation</span>
        <Button variant="plain" onClick={save} disabled={!valid}>
          Save
        </Button>
      </div>
      <div {...stylex.props(styles.edBody)}>
        <label {...stylex.props(styles.field)} htmlFor="auto-trigger">
          <Text size="footnote" color="secondary" xstyle={[styles.label]}>
            Trigger
          </Text>
          <TextField
            id="auto-trigger"
            value={draft.trigger}
            onChange={(e) => patchEditor({ trigger: e.target.value })}
          />
        </label>
        <label {...stylex.props(styles.field)} htmlFor="auto-action">
          <Text size="footnote" color="secondary" xstyle={[styles.label]}>
            Action
          </Text>
          <TextField id="auto-action" value={draft.action} onChange={(e) => patchEditor({ action: e.target.value })} />
        </label>
        <Section>
          <div {...stylex.props(styles.auto, styles.enabledRow)}>
            <span>Enabled</span>
            <span {...stylex.props(styles.autoSwitch)}>
              <Toggle
                aria-label="Enabled"
                checked={draft.enabled}
                onChange={(e) => patchEditor({ enabled: e.target.checked })}
              />
            </span>
          </div>
        </Section>
        <Button
          variant="plain"
          xstyle={[styles.danger]}
          onClick={() => {
            deleteAutomation(draft.id)
            say('Automation deleted')
            closeEditor()
          }}
        >
          Delete Automation
        </Button>
      </div>
    </>
  )
}

/** The draft decides which sheet is up; both share the one card. */
export const Editors = () => {
  const editor = useEditor()
  return (
    <Sheet open={!!editor} onClose={closeEditor} aria-label="Editor" xstyle={[styles.sheet]}>
      {editor?.kind === 'shortcut' && <ShortcutEditor draft={editor} />}
      {editor?.kind === 'automation' && <AutomationEditor draft={editor} />}
    </Sheet>
  )
}
