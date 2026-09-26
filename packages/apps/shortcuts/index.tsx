// Shortcuts: a grid of tappable cards that actually run, an automations list
// whose rows open an editor, and a Recent log of what fired. The cards, their
// drafts and the run history live in store.ts so the fold keeps them.

import { art, beep } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { IconButton, LargeTitle, Menu, Screen, Section, Text, Title, Toggle } from '@doan-labs/duo-uikit'
import { animations, typography } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Editors } from './editor.tsx'
import {
  type Automation,
  clearRuns,
  deleteShortcut,
  openAutomationEditor,
  openShortcutEditor,
  type RunState,
  runShortcut,
  type Shortcut,
  say,
  toggleAutomation,
  useAutomations,
  useRuns,
  useShortcuts,
  useStates,
  useToastMsg
} from './store.ts'
import { styles } from './styles.ts'

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** One card. The face runs the shortcut; the corner button opens its menu. */
const Card = ({ sc, os }: { sc: Shortcut; os: Os }) => {
  const states = useStates()
  const [menu, setMenu] = useState(false)
  const state: RunState | undefined = states[sc.id]
  const run = () => {
    beep([880, 1320], 0.06, 0.05)
    void runShortcut(sc, os)
  }
  return (
    <div {...stylex.props(styles.shell)}>
      <button
        type="button"
        aria-label={`Run ${sc.name}`}
        disabled={state === 'running'}
        {...stylex.props(styles.sc, styles.bg(art(sc.name, 52)))}
        onClick={run}
      >
        <div {...stylex.props(styles.glyph)}>{sc.icon}</div>
        <b {...stylex.props(styles.name)}>{sc.name}</b>
        <div aria-live="polite" {...stylex.props(styles.ok, !!state && styles.okOn)}>
          {state === 'running' && <i {...stylex.props(styles.spin)} />}
          {state === 'done' && '✓'}
          {state === 'failed' && <span {...stylex.props(styles.fail)}>✕</span>}
        </div>
      </button>
      <span {...stylex.props(styles.more)}>
        <IconButton
          name="ellipsis"
          size={14}
          aria-label={`${sc.name} options`}
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
        />
      </span>
      <Menu
        open={menu}
        onClose={() => setMenu(false)}
        xstyle={[styles.menu]}
        items={[
          { label: 'Run', icon: 'bolt', disabled: state === 'running', onSelect: run },
          { label: 'Edit', icon: 'compose', onSelect: () => openShortcutEditor(sc) },
          {
            label: 'Delete',
            icon: 'trash',
            onSelect: () => {
              deleteShortcut(sc.id)
              say('Shortcut deleted')
            }
          }
        ]}
      />
    </div>
  )
}

/** An automation row: the text half opens its editor, the switch toggles it directly. */
const AutomationRow = ({ a }: { a: Automation }) => (
  <div {...stylex.props(styles.auto)}>
    <button
      type="button"
      aria-label={`Edit automation: ${a.trigger}`}
      {...stylex.props(styles.autoBtn, !a.enabled && styles.autoOff)}
      onClick={() => openAutomationEditor(a)}
    >
      <span {...stylex.props(styles.autoTx)}>
        <span>{a.trigger}</span>
        <span {...stylex.props(typography.footnote, styles.autoSub)}>{a.action}</span>
      </span>
      <Text size="footnote" color="tertiary">
        {a.enabled ? 'On' : 'Off'}
      </Text>
    </button>
    <span {...stylex.props(styles.autoSwitch)}>
      <Toggle aria-label={`${a.trigger} enabled`} checked={a.enabled} onChange={() => toggleAutomation(a.id)} />
    </span>
  </div>
)

const Toast = () => {
  const toast = useToastMsg()
  return toast ? (
    <div role="status" {...stylex.props(styles.toast, animations.float)}>
      {toast}
    </div>
  ) : null
}

export const Shortcuts = ({ os }: { os: Os }) => {
  const shortcuts = useShortcuts()
  const automations = useAutomations()
  const runs = useRuns()
  return (
    <Screen>
      <div {...stylex.props(styles.headRow)}>
        <LargeTitle xstyle={[styles.hero]}>Shortcuts</LargeTitle>
      </div>
      {/* A row of its own: the shell's Mockup badge floats over the title's trailing edge. */}
      <div {...stylex.props(styles.toolRow)}>
        <IconButton
          name="plus"
          size={17}
          variant="tinted"
          aria-label="New Shortcut"
          onClick={() => openShortcutEditor()}
        />
      </div>
      {shortcuts.length === 0 ? (
        <div {...stylex.props(styles.empty)}>No shortcuts yet. Tap + to make one.</div>
      ) : (
        <div {...stylex.props(styles.scs)}>
          {shortcuts.map((sc) => (
            <Card key={sc.id} sc={sc} os={os} />
          ))}
        </div>
      )}
      <Title xstyle={[styles.hdrSm]}>Automations</Title>
      <Section>
        {automations.length === 0 && <div {...stylex.props(styles.empty)}>No automations</div>}
        {automations.map((a) => (
          <AutomationRow key={a.id} a={a} />
        ))}
      </Section>
      <Title xstyle={[styles.hdrSm, styles.histTitle]}>
        Recent
        {runs.length > 0 && (
          <button type="button" {...stylex.props(styles.clear)} onClick={() => clearRuns()}>
            Clear
          </button>
        )}
      </Title>
      <Section>
        {runs.length === 0 && <div {...stylex.props(styles.empty)}>Nothing has run yet</div>}
        {runs.map((r) => (
          <div key={r.id} {...stylex.props(styles.auto)}>
            <span {...stylex.props(styles.runMark, !r.ok && styles.fail)}>{r.ok ? '✓' : '✕'}</span>
            <span {...stylex.props(styles.autoTx, styles.runTx)}>
              <span>{r.name}</span>
              <span {...stylex.props(typography.footnote, styles.autoSub)}>{r.detail}</span>
            </span>
            <Text size="footnote" color="tertiary" xstyle={[styles.runTime]}>
              {time(r.at)}
            </Text>
          </div>
        ))}
      </Section>
      <Editors />
      <Toast />
    </Screen>
  )
}
