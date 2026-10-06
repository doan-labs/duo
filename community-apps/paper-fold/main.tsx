import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import {
  Button,
  IconButton,
  Placeholder,
  Push,
  Row,
  Section,
  Sheet,
  Sym,
  Text,
  Title,
  Toggle,
  useDisplay,
  useWide
} from '@doan-labs/duo-uikit'
import { dark, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import { app, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue, setMuted, unlockAudio } from './audio.ts'
import { StepDiagram } from './diagram.tsx'
import {
  clampStep,
  isResult,
  mergeProgress,
  modelDone,
  newerSeq,
  type Prefs,
  type ProgressMap,
  parsePrefs,
  parseProgress,
  parseUi,
  progressSubset,
  recordProgress,
  resumeStep,
  type UiState
} from './engine.ts'
import { MODELS, type Model, modelById } from './models.ts'
import { styles } from './styles.ts'

// The pre-connect window guard only needs a live callback while the legend
// sheet is open; everywhere else Escape falls through to the shell's go-home.
let escapeBack: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !escapeBack) return
    event.preventDefault()
    event.stopImmediatePropagation()
    escapeBack()
  },
  true
)

function SpeakerGlyph({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 15 15" width={15} height={15} aria-hidden="true">
      <path
        d="M7.5 2.6 L4.4 5.4 L1.9 5.4 L1.9 9.6 L4.4 9.6 L7.5 12.4 Z M9.6 5.2 Q11.6 7.5 9.6 9.8 M11.2 3.6 Q14.4 7.5 11.2 11.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {off && <path d="M2 2.4 L13 12.8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" fill="none" />}
    </svg>
  )
}

function SoundButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      aria-pressed={muted}
      onClick={onToggle}
      {...stylex.props(styles.soundBtn, shared.press)}
    >
      <SpeakerGlyph off={muted} />
    </button>
  )
}

function LevelDots({ level }: { level: number }) {
  return (
    <span {...stylex.props(styles.levelDots)} role="img" aria-label={`Level ${level} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} {...stylex.props(styles.levelDot, i < level && styles.levelOn)} />
      ))}
    </span>
  )
}

// Shared by both layouts: one model row in the rail or the cover list.
function ModelRow({
  model,
  progress,
  current,
  onOpen
}: {
  model: Model
  progress: ProgressMap[string] | undefined
  current: boolean
  onOpen: (m: Model) => void
}) {
  const total = model.steps.length
  const done = modelDone(progress)
  const detail = done ? (
    <span {...stylex.props(styles.doneChip)}>
      <Sym name="tick" size={12} /> Done
    </span>
  ) : progress && progress.hi > 0 ? (
    <span {...stylex.props(styles.stepChip)}>
      {Math.min(progress.hi, total)}/{total}
    </span>
  ) : undefined
  return (
    <Row
      as="button"
      label={model.name}
      subtitle={
        <span {...stylex.props(styles.subFlex)}>
          {model.blurb} <LevelDots level={model.level} />
        </span>
      }
      icon={
        <span {...stylex.props(styles.modelIcon)}>
          <StepDiagram els={model.result} still eager />
        </span>
      }
      detail={detail}
      chevron={!current}
      onClick={() => onOpen(model)}
      aria-current={current ? 'true' : undefined}
      xstyle={current ? styles.rowOn : undefined}
    />
  )
}

function LegendSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    escapeBack = open ? onClose : null
    return () => {
      if (escapeBack === onClose) escapeBack = null
    }
  }, [open, onClose])
  return (
    <Sheet open={open} onClose={onClose} aria-label="How to read the folds">
      <div {...stylex.props(styles.sheetCard)}>
        <Text size="title3" weight="semibold">
          Reading the folds
        </Text>
        <div {...stylex.props(styles.legendRow)}>
          <span {...stylex.props(styles.legendSample)}>
            <svg viewBox="0 0 56 30" width={56} height={30} aria-hidden="true">
              <path
                d="M8 15 L48 15"
                fill="none"
                stroke={colors.blue}
                strokeWidth={2}
                strokeDasharray="5 3.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <div {...stylex.props(styles.legendText)}>Valley fold</div>
            <div {...stylex.props(styles.legendCap)}>Fold the paper toward you along the dashed line.</div>
          </div>
        </div>
        <div {...stylex.props(styles.legendRow)}>
          <span {...stylex.props(styles.legendSample)}>
            <svg viewBox="0 0 56 30" width={56} height={30} aria-hidden="true">
              <path
                d="M8 15 L48 15"
                fill="none"
                stroke={colors.orange}
                strokeWidth={2}
                strokeDasharray="6 2.4 1.6 2.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <div {...stylex.props(styles.legendText)}>Mountain fold</div>
            <div {...stylex.props(styles.legendCap)}>Fold the paper away from you along the dash-dot line.</div>
          </div>
        </div>
        <div {...stylex.props(styles.legendRow)}>
          <span {...stylex.props(styles.legendSample)}>
            <svg viewBox="0 0 56 30" width={56} height={30} aria-hidden="true">
              <path d="M10 22 Q28 4 46 14" fill="none" stroke={colors.green} strokeWidth={2} strokeLinecap="round" />
              <path d="M46 14 L38.6 12.4 L44.4 7.4 Z" fill={colors.green} />
            </svg>
          </span>
          <div>
            <div {...stylex.props(styles.legendText)}>Motion arrow</div>
            <div {...stylex.props(styles.legendCap)}>
              Shows where the flap travels. The faint outline is its landing spot.
            </div>
          </div>
        </div>
        <div {...stylex.props(styles.legendRow)}>
          <span {...stylex.props(styles.legendSample)}>
            <svg viewBox="0 0 56 30" width={56} height={30} aria-hidden="true">
              <circle cx={28} cy={15} r={10} fill="none" stroke={app.separator} strokeWidth={1} />
              <path
                d="M24.6 16.2 A5 5 0 1 1 26.6 10.2 M23 10.4 L26.6 10.2 L26.4 13.4"
                fill="none"
                stroke={app.label2}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <div {...stylex.props(styles.legendText)}>Action badge</div>
            <div {...stylex.props(styles.legendCap)}>
              Marks a non-fold action: turn over, open up, or blow to inflate.
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

// The steps overview rail: mini diagrams you can jump to, with roving focus.
function StepRail({
  model,
  at,
  result,
  onStep
}: {
  model: Model
  at: number
  result: boolean
  onStep: (step: number, kind?: Cue) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const total = model.steps.length
  const current = result ? total : at

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const target = Math.max(0, Math.min(total, current + (e.key === 'ArrowDown' ? 1 : -1)))
    onStep(target)
    requestAnimationFrame(() => {
      railRef.current?.querySelector<HTMLElement>('[data-current="true"]')?.focus()
    })
  }

  return (
    <div ref={railRef} role="listbox" aria-label="Steps" {...stylex.props(styles.stepRail)} onKeyDown={onKey}>
      {model.steps.map((s, i) => {
        const cur = i === current
        const passed = i < current
        return (
          <button
            key={s.t}
            type="button"
            role="option"
            aria-selected={cur}
            data-current={cur}
            tabIndex={cur ? 0 : -1}
            onClick={() => onStep(i)}
            {...stylex.props(styles.stepItem, shared.press, cur && styles.stepItemOn)}
          >
            <span {...stylex.props(styles.stepThumb)}>
              <StepDiagram els={s.els} still eager />
            </span>
            <span {...stylex.props(styles.stepItemLabel)}>
              {i + 1}. {s.t}
            </span>
            {passed ? <Sym name="tick" size={11} /> : <span {...stylex.props(styles.stepNum)} />}
          </button>
        )
      })}
      <button
        type="button"
        role="option"
        aria-selected={result}
        data-current={result}
        tabIndex={result ? 0 : -1}
        onClick={() => onStep(total)}
        {...stylex.props(styles.stepItem, shared.press, result && styles.stepItemOn)}
      >
        <span {...stylex.props(styles.stepThumb)}>
          <StepDiagram els={model.result} still eager />
        </span>
        <span {...stylex.props(styles.stepItemLabel)}>Result</span>
        {result && <Sym name="tick" size={11} />}
      </button>
    </div>
  )
}

function Coach({
  model,
  step,
  progress,
  progressMap,
  still,
  wide,
  canGoBack,
  onBack,
  onStep,
  onReplay,
  onNextModel,
  muted,
  onToggleSound,
  onLegend
}: {
  model: Model
  step: number
  progress: ProgressMap[string] | undefined
  progressMap: ProgressMap
  still: boolean
  wide: boolean
  canGoBack: boolean
  onBack: () => void
  onStep: (step: number, kind?: Cue) => void
  onReplay: () => void
  onNextModel: (m: Model) => void
  muted: boolean
  onToggleSound: () => void
  onLegend: () => void
}) {
  const total = model.steps.length
  const result = isResult(total, step)
  const at = clampStep(total - 1, step) // index of the step to render, never the result slot
  const current = result ? null : model.steps[at]
  const nextModel = MODELS.find((m) => m.id !== model.id && !modelDone(progressMap[m.id]))

  return (
    <div {...stylex.props(styles.coach)}>
      <div {...stylex.props(shared.hdr)}>
        {canGoBack && (
          <button
            type="button"
            aria-label="Back to models"
            {...stylex.props(shared.bk, styles.bkTap, shared.press)}
            onClick={onBack}
          >
            <Sym name="back" size={20} />
          </button>
        )}
        <span {...stylex.props(styles.hdrGrow)}>{model.name}</span>
        {wide && <span {...stylex.props(styles.hdrCenter)}>{result ? 'Finished' : `Step ${at + 1} of ${total}`}</span>}
        <div {...stylex.props(shared.hdrSm)}>
          <IconButton name="info" aria-label="How to read the folds" xstyle={styles.hdrTap} onClick={onLegend} />
          <SoundButton muted={muted} onToggle={onToggleSound} />
        </div>
      </div>
      <div {...stylex.props(styles.stage)}>
        {wide && <StepRail model={model} at={at} result={result} onStep={onStep} />}
        <div {...stylex.props(styles.pane, !wide && styles.paneNarrow)}>
          {result ? (
            <>
              <div {...stylex.props(styles.card)} key={`${model.id}-result`}>
                <StepDiagram els={model.result} still={still} />
              </div>
              <div {...stylex.props(styles.resultTitle)}>You folded a {model.name}!</div>
              <div {...stylex.props(styles.resultText)} role="status" aria-live="polite">
                Nice folding. Try it with different paper - small sheets are trickier.
              </div>
              <div {...stylex.props(styles.resultBtns)}>
                <Button xstyle={styles.navBtn} onClick={onReplay}>
                  <Sym name="reload" size={14} /> Fold again
                </Button>
                <Button xstyle={styles.navBtn} onClick={onBack}>
                  <Sym name="grid" size={14} /> All models
                </Button>
                {nextModel && (
                  <Button variant="filled" xstyle={styles.navBtn} onClick={() => onNextModel(nextModel)}>
                    Next: {nextModel.name}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div {...stylex.props(styles.card)} key={`${model.id}-${at}`}>
                <StepDiagram els={current!.els} still={still} />
              </div>
              {!wide && (
                <div {...stylex.props(styles.dots)} aria-hidden="true">
                  {model.steps.map((s, i) => (
                    <span key={s.t} {...stylex.props(styles.dot, i <= at && styles.dotOn)} />
                  ))}
                  <span {...stylex.props(styles.dot, progress?.done && styles.dotDone)} />
                </div>
              )}
              <div {...stylex.props(styles.stepTitle)}>{current!.t}</div>
              <div {...stylex.props(styles.stepText)} role="status" aria-live="polite">
                Step {at + 1} of {total} - {current!.text}
              </div>
              <div {...stylex.props(styles.transport)}>
                <Button xstyle={styles.navBtn} onClick={() => onStep(at - 1, 'back')} disabled={at === 0}>
                  <Sym name="back" size={14} /> Back
                </Button>
                <span {...stylex.props(styles.transportMid)} aria-hidden="true">
                  {at + 1} / {total}
                </span>
                <Button
                  variant="filled"
                  xstyle={styles.navBtn}
                  onClick={() => onStep(at + 1, at + 1 === total ? 'done' : 'fold')}
                >
                  {at + 1 === total ? 'Finish' : 'Next'} <Sym name="forward" size={14} />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PaperFold() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const ui = useKV(os.session, 'ui')
  const progressKV = useKV(os.storage, 'progress')
  const prefsKV = useKV(os.storage, 'prefs')

  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])

  const [legend, setLegend] = useState(false)
  useEffect(() => {
    if (legend && !view.visible) setLegend(false)
  }, [legend, view.visible])

  // Audio unlock needs a real gesture once per copy.
  useEffect(() => {
    const on = () => unlockAudio()
    addEventListener('pointerdown', on)
    addEventListener('keydown', on)
    return () => {
      removeEventListener('pointerdown', on)
      removeEventListener('keydown', on)
    }
  }, [])

  // Writer identity + best-known docs. useKV.value is a hydrated snapshot that
  // can lag a foreign write by a few hundred ms, so every mutation builds on a
  // locally held best rather than the snapshot: seq/by gives ui and prefs a
  // total order (stale writes never adopted; the active copy repairs the store
  // when an older foreign write lands), and progress merges as a CRDT.
  const byId = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const [uiState, setUiState] = useState<UiState>({ v: 1, model: null, step: 0, seq: 0, by: '' })
  const [prefs, setPrefs] = useState<Prefs>({ v: 1, muted: false, motion: true, seq: 0, by: '' })
  const [progress, setProgress] = useState<ProgressMap>({})
  const uiBest = useRef(uiState)
  const prefsBest = useRef(prefs)
  const progressBest = useRef(progress)
  const activeRef = useRef(false)
  activeRef.current = view.active
  // Dedupe for repair writes: useKV's set is a fresh closure per render so
  // these effects re-fire freely; each distinct payload repairs at most once.
  const uiWritten = useRef<string | null>(null)
  const prefsWritten = useRef<string | null>(null)
  const progWritten = useRef<string | null>(null)
  const progJson = useRef('{}')

  // Adopt a strictly newer foreign position; when the shared doc lands behind
  // our best (a stale foreign write), the active copy repairs it once.
  useEffect(() => {
    if (ui.status === 'hydrating') return
    const f = parseUi(ui.value)
    if (newerSeq(f, uiBest.current)) {
      uiBest.current = f
      setUiState(f)
      return
    }
    if (!activeRef.current || !newerSeq(uiBest.current, f)) return
    if (f.seq === 0 && f.model === null) return // nothing stored - do not create it
    const s = JSON.stringify(uiBest.current)
    if (ui.value === s || uiWritten.current === s) return
    uiWritten.current = s
    ui.set(s)
  }, [ui.value, ui.status, ui.set])

  useEffect(() => {
    if (prefsKV.status === 'hydrating') return
    const f = parsePrefs(prefsKV.value)
    if (newerSeq(f, prefsBest.current)) {
      prefsBest.current = f
      setPrefs(f)
      return
    }
    if (!activeRef.current || !newerSeq(prefsBest.current, f) || f.seq === 0) return
    const s = JSON.stringify(prefsBest.current)
    if (prefsKV.value === s || prefsWritten.current === s) return
    prefsWritten.current = s
    prefsKV.set(s)
  }, [prefsKV.value, prefsKV.status, prefsKV.set])

  // Progress is a grow-only map: merge keeps every foreign entry (a stale
  // whole-map write loses nothing on read), and the active copy re-emits the
  // superset when the store doc is missing entries.
  useEffect(() => {
    if (progressKV.status === 'hydrating') return
    const f = parseProgress(progressKV.value)
    const merged = mergeProgress(progressBest.current, f)
    progressBest.current = merged
    const mJson = JSON.stringify(merged)
    if (mJson !== progJson.current) {
      progJson.current = mJson
      setProgress(merged)
    }
    if (!activeRef.current || progressSubset(merged, f)) return
    if (progressKV.value === mJson || progWritten.current === mJson) return
    progWritten.current = mJson
    progressKV.set(mJson)
  }, [progressKV.value, progressKV.status, progressKV.set])

  const still = !prefs.motion

  useEffect(() => setMuted(prefs.muted), [prefs.muted])

  const model = modelById(uiState.model)
  const hydrated = ui.status !== 'hydrating'

  const readySent = useRef(false)
  useEffect(() => {
    if (readySent.current || ui.status === 'hydrating') return
    readySent.current = true
    requestAnimationFrame(() => os.ready())
  }, [ui.status])

  const active = view.active
  const ping = useCallback(
    (kind: Cue) => {
      if (active) cue(kind)
    },
    [active]
  )

  const go = useCallback(
    (patch: { model: string | null; step: number }) => {
      const next: UiState = { ...uiBest.current, ...patch, seq: uiBest.current.seq + 1, by: byId }
      uiBest.current = next
      setUiState(next)
      const s = JSON.stringify(next)
      uiWritten.current = s
      ui.set(s)
    },
    [ui.set, byId]
  )

  const commitPrefs = useCallback(
    (patch: Partial<Pick<Prefs, 'muted' | 'motion'>>) => {
      const next: Prefs = { ...prefsBest.current, ...patch, seq: prefsBest.current.seq + 1, by: byId }
      prefsBest.current = next
      setPrefs(next)
      const s = JSON.stringify(next)
      prefsWritten.current = s
      prefsKV.set(s)
    },
    [prefsKV.set, byId]
  )

  const writeProgress = useCallback(
    (modelId: string, step: number, steps: number) => {
      const merged = mergeProgress(
        progressBest.current,
        recordProgress(progressBest.current, modelId, step, steps, Date.now())
      )
      progressBest.current = merged
      const mJson = JSON.stringify(merged)
      progJson.current = mJson
      progWritten.current = mJson
      setProgress(merged)
      progressKV.set(mJson)
    },
    [progressKV.set]
  )

  const openModel = useCallback(
    (m: Model) => {
      const p = progressBest.current[m.id]
      go({ model: m.id, step: resumeStep(m.steps.length, p) })
      ping('select')
    },
    [go, ping]
  )

  const goStep = useCallback(
    (m: Model, s: number, kind: Cue = 'fold') => {
      const step = clampStep(m.steps.length, s)
      go({ model: m.id, step })
      writeProgress(m.id, step, m.steps.length)
      ping(kind)
    },
    [go, ping, writeProgress]
  )

  const toModels = useCallback(() => {
    go({ model: null, step: 0 })
    ping('back')
  }, [go, ping])

  const toggleSound = useCallback(() => {
    commitPrefs({ muted: !prefsBest.current.muted })
    ping('select')
  }, [commitPrefs, ping])

  const toggleMotion = useCallback(() => {
    commitPrefs({ motion: !prefsBest.current.motion })
  }, [commitPrefs])

  // Arrow keys step through a model on whichever copy has focus.
  useEffect(() => {
    if (!model || legend) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goStep(model, uiState.step + 1, uiState.step + 1 === model.steps.length ? 'done' : 'fold')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goStep(model, uiState.step - 1, 'back')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [model, legend, uiState.step, goStep])

  const modelsList = (
    <>
      <Title>Paper Fold</Title>
      <div {...stylex.props(styles.listWrap)}>
        <Section aria-label="Models">
          {MODELS.map((m) => (
            <ModelRow key={m.id} model={m} progress={progress[m.id]} current={model?.id === m.id} onOpen={openModel} />
          ))}
        </Section>
        <Section aria-label="Options">
          <Row
            label="Sound effects"
            icon={<Sym name="volume" size={16} />}
            detail={<Toggle checked={!prefs.muted} onChange={toggleSound} aria-label="Sound effects" />}
          />
          <Row
            label="Motion"
            icon={<Sym name="wind" size={16} />}
            detail={<Toggle checked={prefs.motion} onChange={toggleMotion} aria-label="Motion" />}
          />
          <Row
            label="Fold legend"
            icon={<Sym name="bookOutline" size={16} />}
            chevron
            as="button"
            onClick={() => setLegend(true)}
          />
        </Section>
      </div>
    </>
  )

  const coach = model ? (
    <Coach
      model={model}
      step={clampStep(model.steps.length, uiState.step)}
      progress={progress[model.id]}
      progressMap={progress}
      still={still}
      wide={wide}
      canGoBack={!wide}
      onBack={toModels}
      onStep={(s, kind) => goStep(model, s, kind)}
      onReplay={() => goStep(model, 0, 'turn')}
      onNextModel={openModel}
      muted={prefs.muted}
      onToggleSound={toggleSound}
      onLegend={() => setLegend(true)}
    />
  ) : null

  return (
    <main
      ref={rootRef}
      data-app="paper-fold"
      data-display={view.display}
      {...stylex.props(darkMode ? dark : light, styles.root)}
    >
      <div {...stylex.props(styles.appBody)} inert={legend}>
        {!hydrated ? (
          <Placeholder>
            <Text color="secondary">Loading…</Text>
          </Placeholder>
        ) : wide ? (
          <div {...stylex.props(styles.split)}>
            <div {...stylex.props(styles.rail)}>
              <div {...stylex.props(styles.coverScroll)}>{modelsList}</div>
            </div>
            {coach ?? (
              <div {...stylex.props(styles.coach)}>
                <Placeholder>
                  <Text size="title3" weight="semibold">
                    Pick a model
                  </Text>
                  <Text color="secondary">Choose a model on the left to start folding.</Text>
                </Placeholder>
              </div>
            )}
          </div>
        ) : (
          <Push open={!!model} sheet={coach}>
            <div {...stylex.props(styles.coverList)}>
              <div {...stylex.props(styles.coverScroll)}>{modelsList}</div>
            </div>
          </Push>
        )}
      </div>
      <LegendSheet open={legend} onClose={() => setLegend(false)} />
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<PaperFold />)
