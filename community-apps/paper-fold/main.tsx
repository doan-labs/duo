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
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue, setMuted, unlockAudio } from './audio.ts'
import { ink, StepDiagram } from './diagram.tsx'
import {
  clampStep,
  isResult,
  mergeProgress,
  modelDone,
  newerSeq,
  type Prefs,
  type ProgressMap,
  parsePrefs,
  parseUi,
  recordProgress,
  resumeStep,
  type UiState
} from './engine.ts'
import { live, stepTarget, stillBound } from './live.ts'
import { MODELS, type Model, modelById } from './models.ts'
import {
  casUpdate,
  decideSeq,
  progressWrite,
  receiptKey,
  receiptWrite,
  reconcileProgress,
  repairAggregate
} from './progress.ts'
import { styles } from './styles.ts'

// New user intent is admitted only on a copy that is both visible and active
// at dispatch time (see live.ts): the SDK view snapshot is read synchronously
// here, so an occluded or parked copy rejects input even when a stale render
// or a leaked event suggests otherwise.
const liveNow = () => live(os.view)

// Receipt keys are per catalog id, so the durable causal record stays bounded.
const MODEL_IDS = MODELS.map((m) => m.id)

// The pre-connect window guard only needs a live callback while the legend
// sheet is open; everywhere else Escape falls through to the shell's go-home.
// It is user intent like any other, so the same admission gate applies.
let escapeBack: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !escapeBack || !liveNow()) return
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
      {...stylex.props(styles.soundBtn, shared.press, styles.pressCalm)}
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
      label={<span {...stylex.props(styles.titleText)}>{model.name}</span>}
      subtitle={
        <span {...stylex.props(styles.subFlex)}>
          <span {...stylex.props(styles.subText)}>{model.blurb}</span>
          <LevelDots level={model.level} />
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
      xstyle={current ? [styles.rowTap, styles.rowOn] : styles.rowTap}
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
                stroke={ink.valley}
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
                stroke={ink.mountain}
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
              <path d="M10 22 Q28 4 46 14" fill="none" stroke={ink.arrow} strokeWidth={2} strokeLinecap="round" />
              <path d="M46 14 L38.6 12.4 L44.4 7.4 Z" fill={ink.arrow} />
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
              <circle cx={28} cy={15} r={10} fill="none" stroke={ink.crease} strokeWidth={1} />
              <path
                d="M24.6 16.2 A5 5 0 1 1 26.6 10.2 M23 10.4 L26.6 10.2 L26.4 13.4"
                fill="none"
                stroke={ink.edge}
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
  onStep,
  best
}: {
  model: Model
  at: number
  result: boolean
  onStep: (step: number, kind?: Cue) => void
  best: { current: { model: string | null } }
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const total = model.steps.length
  const current = result ? total : at

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    // New intent needs a live copy at dispatch; onStep alone rejecting the
    // mutation would still leave a hidden copy scheduling focus work.
    if (!liveNow()) return
    e.preventDefault()
    const target = Math.max(0, Math.min(total, current + (e.key === 'ArrowDown' ? 1 : -1)))
    onStep(target)
    const railModel = model.id
    requestAnimationFrame(() => {
      // Deferred focus is admitted work, not persistence completion: it
      // re-admits against the current snapshot and drops if a peer switched
      // the session to another model meanwhile.
      if (!stillBound(os.view, best.current, railModel)) return
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
            {...stylex.props(styles.stepItem, shared.press, styles.pressCalm, cur && styles.stepItemOn)}
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
        {...stylex.props(styles.stepItem, shared.press, styles.pressCalm, result && styles.stepItemOn)}
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
  onStepBy,
  best,
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
  onStepBy: (delta: number, kind?: Cue) => void
  best: { current: { model: string | null } }
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
            {...stylex.props(shared.bk, styles.bkTap, shared.press, styles.pressCalm)}
            onClick={onBack}
          >
            <Sym name="back" size={20} />
          </button>
        )}
        <span {...stylex.props(styles.hdrGrow)}>{model.name}</span>
        {wide && <span {...stylex.props(styles.hdrStatus)}>{result ? 'Finished' : `Step ${at + 1} of ${total}`}</span>}
        <div {...stylex.props(shared.hdrSm)}>
          <IconButton name="info" aria-label="How to read the folds" xstyle={styles.hdrTap} onClick={onLegend} />
          <SoundButton muted={muted} onToggle={onToggleSound} />
        </div>
      </div>
      <div {...stylex.props(styles.stage)}>
        {wide && <StepRail model={model} at={at} result={result} onStep={onStep} best={best} />}
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
                <Button xstyle={[styles.navBtn, styles.pressCalm]} onClick={onReplay}>
                  <Sym name="reload" size={14} /> Fold again
                </Button>
                <Button xstyle={[styles.navBtn, styles.pressCalm]} onClick={onBack}>
                  <Sym name="grid" size={14} /> All models
                </Button>
                {nextModel && (
                  <Button
                    variant="filled"
                    xstyle={[styles.navBtn, styles.pressCalm]}
                    onClick={() => onNextModel(nextModel)}
                  >
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
                <Button
                  xstyle={[styles.navBtn, styles.pressCalm]}
                  onClick={() => onStepBy(-1, 'back')}
                  disabled={at === 0}
                >
                  <Sym name="back" size={14} /> Back
                </Button>
                <span {...stylex.props(styles.transportMid)} aria-hidden="true">
                  {at + 1} / {total}
                </span>
                <Button variant="filled" xstyle={[styles.navBtn, styles.pressCalm]} onClick={() => onStepBy(1, 'fold')}>
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
  // Receipt subscriptions share the space's single KVMirror (useKV memoizes it
  // per space), so each of these is a snapshot read, not another watch: a
  // foreign per-model commit re-runs the reconcile pass even though it never
  // touches the aggregate doc.
  const receipts = [
    useKV(os.storage, receiptKey('dart')).value,
    useKV(os.storage, receiptKey('boat')).value,
    useKV(os.storage, receiptKey('cup')).value,
    useKV(os.storage, receiptKey('helmet')).value,
    useKV(os.storage, receiptKey('tulip')).value,
    useKV(os.storage, receiptKey('balloon')).value
  ]
  const progressWatch = [progressKV.value, ...receipts].join('\u0001')

  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])

  const [legend, setLegend] = useState(false)
  useEffect(() => {
    if (legend && !view.visible) setLegend(false)
  }, [legend, view.visible])

  // Folding strands DOM focus inside the hidden copy's iframe (its sheet also
  // unmounts its focused node), so keys keep landing on the invisible copy.
  // Landing focus on the visible copy's root restores keyboard control to it.
  useEffect(() => {
    // The render-time view decides when to retry; the synchronous os.view
    // snapshot decides whether this copy is still admitted at fire time.
    if (view.visible && view.active && liveNow()) rootRef.current?.focus({ preventScroll: true })
  }, [view.visible, view.active, rootRef])

  // Audio unlock needs a real gesture once per copy - and only on the live
  // copy, so an event landing on a hidden one cannot unlock its context.
  useEffect(() => {
    const on = () => {
      if (liveNow()) unlockAudio()
    }
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
  const liveRef = useRef(false)
  liveRef.current = view.active && view.visible
  // Repair dedupe keys on the durable state actually observed, never on our own
  // optimistic payload: a stale foreign write that lands after ours is a fresh
  // deficiency and must be repaired again.
  const repairSig = useRef<{ sig: string | null }>({ sig: null })
  const progJson = useRef('{}')
  const progBusy = useRef(false)
  const progAgain = useRef(false)
  const progPass = useRef<() => void>(() => {})
  const progRetry = useRef(0)
  // A write the store never acked (timeout/rate limit) is retried by one
  // delayed reconcile pass - deduped there against whatever actually
  // committed, so this can never become an idle write storm.
  const scheduleProgRetry = useCallback(() => {
    if (progRetry.current) return
    progRetry.current = window.setTimeout(() => {
      progRetry.current = 0
      if (progBusy.current) progAgain.current = true
      else progPass.current()
    }, 1500)
  }, [])

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
    if (!liveRef.current || !newerSeq(uiBest.current, f)) return
    if (f.seq === 0 && f.model === null) return // nothing stored - do not create it
    const s = JSON.stringify(uiBest.current)
    if (ui.value === s) return
    // Conditional write: the mirror's set is not a durable ack, and a
    // compare-and-set can never overwrite a foreign seq that raced in.
    void casUpdate(os.session, 'ui', parseUi, decideSeq, uiBest.current, JSON.stringify).then((r) => {
      if ((r.kind === 'adopted' || r.kind === 'committed') && newerSeq(r.committed, uiBest.current)) {
        uiBest.current = r.committed
        setUiState(r.committed)
      }
    })
  }, [ui.value, ui.status])

  useEffect(() => {
    if (prefsKV.status === 'hydrating') return
    const f = parsePrefs(prefsKV.value)
    if (newerSeq(f, prefsBest.current)) {
      prefsBest.current = f
      setPrefs(f)
      return
    }
    if (!liveRef.current || !newerSeq(prefsBest.current, f) || f.seq === 0) return
    const s = JSON.stringify(prefsBest.current)
    if (prefsKV.value === s) return
    void casUpdate(os.storage, 'prefs', parsePrefs, decideSeq, prefsBest.current, JSON.stringify).then((r) => {
      if ((r.kind === 'adopted' || r.kind === 'committed') && newerSeq(r.committed, prefsBest.current)) {
        prefsBest.current = r.committed
        setPrefs(r.committed)
      }
    })
  }, [prefsKV.value, prefsKV.status])

  // Progress is a grow-only map over a durable aggregate plus bounded per-model
  // receipts (progress.ts). Every observed durable change folds aggregate and
  // receipts into best - both copies adopt - and a live copy repairs what the
  // durable evidence actually lacks, keyed on the durable read instead of our
  // own optimistic payload so a stale whole-doc write landing late is repaired.
  // Passes are tail-coalesced: only one runs at a time per copy and every
  // trigger during it folds into a single follow-up, so a burst of own-write
  // echoes cannot stack durable reads and repairs past the host's in-flight
  // request cap and starve ordinary writes out.
  useEffect(() => {
    if (progressKV.status === 'hydrating') return
    // progressWatch is the trigger, not an input: receipt and aggregate values
    // only decide WHEN a pass runs; the pass re-reads durable itself.
    void progressWatch
    progPass.current = () => {
      progBusy.current = true
      void reconcileProgress(os.storage, MODEL_IDS, progressBest.current, live(view) && liveNow(), repairSig.current)
        .then(({ merged, plan }) => {
          // Union the pass result with best at adopt time: an optimistic write
          // landed during the await must never be overwritten by older state.
          progressBest.current = mergeProgress(merged, progressBest.current)
          const mJson = JSON.stringify(progressBest.current)
          if (mJson !== progJson.current) {
            progJson.current = mJson
            setProgress(progressBest.current)
          }
          // The aggregate repair is itself a conditional write: it commits
          // only if the durable doc still lacks facts, and a covering doc
          // adopted in the meantime ends the repair without a write.
          if (plan.aggregate) void repairAggregate(os.storage, plan.aggregate)
          // Receipt repairs take the same conditional write as user
          // progress, so a repair never clobbers a concurrent peer fact.
          for (const [id, rec] of Object.entries(plan.receipts))
            void receiptWrite(os.storage, id, rec).then(({ acked, gone }) => {
              if (!acked && !gone) scheduleProgRetry()
            })
        })
        .catch(() => {})
        .finally(() => {
          progBusy.current = false
          if (progAgain.current) {
            progAgain.current = false
            progPass.current()
          }
        })
    }
    if (progBusy.current) {
      progAgain.current = true
      return
    }
    progPass.current()
    // `view` joins the gate and the deps so a copy turning live re-runs the
    // pass: a reconcile that ran while hidden skips durable repair, and the
    // live transition re-arms it.
  }, [progressWatch, progressKV.status, view, scheduleProgRetry])

  const still = !prefs.motion

  useEffect(() => setMuted(prefs.muted), [prefs.muted])

  const model = modelById(uiState.model)
  const hydrated = ui.status !== 'hydrating'

  // Readiness reports only once every durable key has hydrated (or failed), so
  // a host that gates input on os.ready cannot admit a write before this copy
  // has seen the stored facts it would merge with.
  const readySent = useRef(false)
  useEffect(() => {
    if (
      readySent.current ||
      ui.status === 'hydrating' ||
      prefsKV.status === 'hydrating' ||
      progressKV.status === 'hydrating'
    )
      return
    readySent.current = true
    requestAnimationFrame(() => os.ready())
  }, [ui.status, prefsKV.status, progressKV.status])

  const ping = useCallback((kind: Cue) => {
    if (liveNow()) cue(kind)
  }, [])

  const go = useCallback(
    (patch: { model: string | null; step: number }) => {
      const next: UiState = { ...uiBest.current, ...patch, seq: uiBest.current.seq + 1, by: byId }
      uiBest.current = next
      setUiState(next)
      void casUpdate(os.session, 'ui', parseUi, decideSeq, next, JSON.stringify).then((r) => {
        if (r.kind === 'adopted' && newerSeq(r.committed, uiBest.current)) {
          uiBest.current = r.committed
          setUiState(r.committed)
        }
      })
    },
    [byId]
  )

  const commitPrefs = useCallback(
    (patch: Partial<Pick<Prefs, 'muted' | 'motion'>>) => {
      const next: Prefs = { ...prefsBest.current, ...patch, seq: prefsBest.current.seq + 1, by: byId }
      prefsBest.current = next
      setPrefs(next)
      void casUpdate(os.storage, 'prefs', parsePrefs, decideSeq, next, JSON.stringify).then((r) => {
        if (r.kind === 'adopted' && newerSeq(r.committed, prefsBest.current)) {
          prefsBest.current = r.committed
          setPrefs(r.committed)
        }
      })
    },
    [byId]
  )

  // An admitted write commits only this model's receipt through the
  // read-modify-verify merge in progress.ts - never the whole-map aggregate,
  // so a stale or concurrent writer cannot discard a peer's facts. An unacked
  // write re-enters through the deduped reconcile pass.
  const writeProgress = useCallback(
    (modelId: string, step: number, steps: number) => {
      const pre = mergeProgress(
        progressBest.current,
        recordProgress(progressBest.current, modelId, step, steps, Date.now())
      )
      progressBest.current = pre
      progJson.current = JSON.stringify(pre)
      setProgress(pre)
      void progressWrite(os.storage, modelId, pre[modelId]!)
        .then(({ map, acked, gone }) => {
          progressBest.current = mergeProgress(progressBest.current, map)
          const mJson = JSON.stringify(progressBest.current)
          if (mJson !== progJson.current) {
            progJson.current = mJson
            setProgress(progressBest.current)
          }
          if (!acked && !gone) scheduleProgRetry()
        })
        .catch(() => scheduleProgRetry())
    },
    [scheduleProgRetry]
  )

  const openModel = useCallback(
    (m: Model) => {
      if (!liveNow()) return
      const p = progressBest.current[m.id]
      go({ model: m.id, step: resumeStep(m.steps.length, p) })
      ping('select')
    },
    [go, ping]
  )

  const goStep = useCallback(
    (m: Model, s: number, kind: Cue = 'fold') => {
      if (!liveNow()) return
      // The intent was issued on this rendered model; if a peer has since
      // switched the session to another model, drop it instead of replaying.
      if (uiBest.current.model !== m.id) return
      const step = clampStep(m.steps.length, s)
      go({ model: m.id, step })
      writeProgress(m.id, step, m.steps.length)
      ping(kind)
    },
    [go, ping, writeProgress]
  )

  // Relative transport (Next/Back, arrow keys): resolved from the best-known
  // step, so two rapid admitted inputs advance two steps even when the render
  // still shows the first one's source.
  const goStepBy = useCallback(
    (m: Model, delta: number, kind: Cue = 'fold') => {
      if (!liveNow()) return
      const target = stepTarget(uiBest.current, m.id, delta, m.steps.length)
      if (target === null) return
      go({ model: m.id, step: target })
      writeProgress(m.id, target, m.steps.length)
      ping(target === m.steps.length ? 'done' : kind)
    },
    [go, ping, writeProgress]
  )

  const toModels = useCallback(() => {
    if (!liveNow()) return
    go({ model: null, step: 0 })
    ping('back')
  }, [go, ping])

  const toggleSound = useCallback(() => {
    if (!liveNow()) return
    commitPrefs({ muted: !prefsBest.current.muted })
    ping('select')
  }, [commitPrefs, ping])

  const toggleMotion = useCallback(() => {
    if (!liveNow()) return
    commitPrefs({ motion: !prefsBest.current.motion })
  }, [commitPrefs])

  // Arrow keys step through a model on whichever copy has focus. Relative
  // intent from the best-known step; hidden/inactive copies reject inside the
  // admission gate, so a key landing there moves nothing.
  useEffect(() => {
    if (!model || legend) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goStepBy(model, 1, 'fold')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goStepBy(model, -1, 'back')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [model, legend, goStepBy])

  // The cover keeps the kit's grouped insets; the narrow rail trades the
  // doubled section margins for label room (see listWrapRail).
  const modelsList = (rail: boolean) => (
    <>
      <Title>Paper Fold</Title>
      <div {...stylex.props(styles.listWrap, rail && styles.listWrapRail)}>
        <Section aria-label="Models" xstyle={rail && styles.sectionFlush}>
          {MODELS.map((m) => (
            <ModelRow key={m.id} model={m} progress={progress[m.id]} current={model?.id === m.id} onOpen={openModel} />
          ))}
        </Section>
        <Section aria-label="Options" xstyle={rail && styles.sectionFlush}>
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
            xstyle={styles.rowTap}
            onClick={() => {
              if (liveNow()) setLegend(true)
            }}
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
      onStepBy={(d, kind) => goStepBy(model, d, kind)}
      best={uiBest}
      onReplay={() => goStep(model, 0, 'turn')}
      onNextModel={openModel}
      muted={prefs.muted}
      onToggleSound={toggleSound}
      onLegend={() => {
        if (liveNow()) setLegend(true)
      }}
    />
  ) : null

  return (
    <main
      ref={rootRef}
      tabIndex={-1}
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
              <div {...stylex.props(styles.coverScroll)}>{modelsList(true)}</div>
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
              <div {...stylex.props(styles.coverScroll)}>{modelsList(false)}</div>
            </div>
          </Push>
        )}
      </div>
      <LegendSheet
        open={legend}
        onClose={() => {
          if (liveNow()) setLegend(false)
        }}
      />
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<PaperFold />)
