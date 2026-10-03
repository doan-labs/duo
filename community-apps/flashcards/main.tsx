import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import {
  Button,
  IconButton,
  Page,
  Placeholder,
  Push,
  Row,
  Screen,
  Section,
  Sheet,
  Sym,
  Text,
  TextField,
  Title,
  useDisplay,
  useWide
} from '@doan-labs/duo-uikit'
import { animations, dark, delay, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type RefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import {
  abandonReview,
  addCard,
  addDeck,
  currentCard,
  type Deck,
  deckCards,
  dueLabel,
  dueQueue,
  formatInterval,
  type Grade,
  getDeck,
  gradeReview,
  type Library,
  nextInterval,
  type ReviewSession,
  removeCard,
  removeDeck,
  renameDeck,
  revealReview,
  reviewsToday,
  serializeLibrary,
  startReview,
  updateCard
} from './cards.ts'
import { LibraryStore } from './storage.ts'
import { styles } from './styles.ts'

/** Session-only UI state: the pane stack and the open editor draft. Decks, cards,
 * due state and the in-progress review live in bounded storage records instead,
 * so the fold and a relaunch both land on the same truth. */
type View = 'decks' | 'deck' | 'review'
type UiState = { v: 1; view: View; deckId?: string }

type DraftKind = 'deck-new' | 'deck-rename' | 'card-new' | 'card-edit'
type Draft = { v: 1; kind: DraftKind; deckId?: string; cardId?: string; name: string; front: string; back: string }

const rec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseUi(raw: string | null): UiState {
  if (!raw) return { v: 1, view: 'decks' }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!rec(parsed)) return { v: 1, view: 'decks' }
    const view: View = parsed.view === 'deck' || parsed.view === 'review' ? parsed.view : 'decks'
    return { v: 1, view, deckId: typeof parsed.deckId === 'string' ? parsed.deckId : undefined }
  } catch {
    return { v: 1, view: 'decks' }
  }
}

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!rec(parsed)) return null
    const kind = parsed.kind
    if (kind !== 'deck-new' && kind !== 'deck-rename' && kind !== 'card-new' && kind !== 'card-edit') return null
    return {
      v: 1,
      kind,
      deckId: typeof parsed.deckId === 'string' ? parsed.deckId : undefined,
      cardId: typeof parsed.cardId === 'string' ? parsed.cardId : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      front: typeof parsed.front === 'string' ? parsed.front : '',
      back: typeof parsed.back === 'string' ? parsed.back : ''
    }
  } catch {
    return null
  }
}

// Registered before os.connect() so it fires ahead of the SDK's window-capture
// Escape-to-home forward: while any app sheet is open, Escape cancels the top
// layer inside the app; at all other times the event passes through and still
// goes home. A stack (not a single callback) because a restored editor draft
// can legitimately sit under the deck-confirm sheet, and Escape peels layers
// top-down.
const escapeStack: (() => void)[] = []
const pushEscape = (cancel: () => void) => {
  escapeStack.push(cancel)
  return () => {
    const i = escapeStack.indexOf(cancel)
    if (i >= 0) escapeStack.splice(i, 1)
  }
}
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || escapeStack.length === 0) return
    const top = escapeStack[escapeStack.length - 1]
    if (!top) return
    event.preventDefault()
    event.stopImmediatePropagation()
    top()
  },
  true
)

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
// offsetParent is null under a position:fixed ancestor in Blink, so a visible
// check has to measure rects instead of trusting the layout parent.
const focusablesIn = (box: HTMLElement) =>
  [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

/**
 * The kit Sheet is deliberately non-modal: it focuses itself and swallows
 * Escape but leaves the page behind it tabbable. A destructive choice needs
 * real modality - while `active` this trap cycles Tab among the sheet's own
 * controls and hands focus back to the element that opened it. The app puts
 * `inert` on the remaining chrome alongside, so the sheet is the only live
 * layer. Focus order starts on `first` or `last` (Cancel sits last).
 */
function useFocusTrap(
  boxRef: RefObject<HTMLElement | null>,
  active: boolean,
  initial: 'first' | 'last' = 'first',
  explicitTrigger?: HTMLElement | null
) {
  const trigger = useRef<HTMLElement | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref contents are read live during the trap, not captured as deps
  useEffect(() => {
    if (!active) return
    // Pointer taps do not move focus to a button, so the opener passes the
    // element it was on; keyboard opens already sit on the trigger.
    trigger.current = explicitTrigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const box = boxRef.current
      if (!box) return
      const els = focusablesIn(box)
      const first = els[0]
      const last = els[els.length - 1]
      if (!first || !last) return
      const at = document.activeElement
      if (e.shiftKey ? at === first || !box.contains(at) : at === last || !box.contains(at)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    const frame = requestAnimationFrame(() => {
      const els = boxRef.current ? focusablesIn(boxRef.current) : []
      ;(initial === 'last' ? els[els.length - 1] : els[0])?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey, true)
      const el = trigger.current
      if (el?.isConnected) {
        // The trigger sits inside the inert subtree until the close commits,
        // so retry across frames until inert lifts and it takes focus again.
        let tries = 0
        const restore = () => {
          if (!el.isConnected) return
          el.focus()
          if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
        }
        requestAnimationFrame(restore)
      } else {
        document.querySelector<HTMLElement>('main button:not([disabled])')?.focus()
      }
    }
  }, [active, initial])
}

/** A destructive confirmation: the kit card plus the modality it leaves out. */
function DestructiveSheet({
  open,
  label,
  onClose,
  restoreTo,
  busy,
  children
}: {
  open: boolean
  label: string
  onClose: () => void
  restoreTo?: HTMLElement | null
  /** Freeze the actions during the presence-out exit: dead buttons, live card. */
  busy?: boolean
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  useFocusTrap(box, open, 'last', restoreTo)
  // While open this is the top escape layer: the pre-connect guard cancels it
  // before the SDK can forward the key to the shell's go-home.
  useEffect(() => (open ? pushEscape(onClose) : undefined), [open, onClose])
  return (
    <Sheet open={open} onClose={onClose} aria-label={label}>
      <div ref={box} inert={busy} {...stylex.props(styles.confirm)}>
        {children}
      </div>
    </Sheet>
  )
}

const DECK_HUES = [colors.indigo, colors.teal, colors.orange, colors.pink, colors.green, colors.purple]
const deckHue = (index: number) => DECK_HUES[index % DECK_HUES.length] ?? colors.indigo

function DeckIcon({ index }: { index: number }) {
  return (
    <span aria-hidden="true" {...stylex.props(styles.deckIcon, styles.deckTint(deckHue(index)))}>
      <Sym name="book" size={15} />
    </span>
  )
}

/** Due chip: orange only when the count is real work, quiet fill otherwise. */
function DueChip({ count }: { count: number }) {
  return <span {...stylex.props(styles.chip, count > 0 ? styles.chipDue : styles.chipQuiet)}>{count} due</span>
}

function DecksScreen({
  lib,
  now,
  resume,
  onNew,
  onOpen,
  onResume
}: {
  lib: Library
  now: number
  resume: { deck: Deck; left: number; done: boolean } | null
  onNew: (trigger: HTMLElement) => void
  onOpen: (deck: Deck) => void
  onResume: (deck: Deck) => void
}) {
  const totalDue = dueQueue(lib.cards, now).length
  const todayCount = reviewsToday(lib, now)
  return (
    <div {...stylex.props(shared.column)}>
      <Title as="h1">
        Flashcards
        <Title variant="accessory">
          <IconButton name="plus" aria-label="New deck" onClick={(e) => onNew(e.currentTarget)} xstyle={styles.hit} />
        </Title>
      </Title>
      <div {...stylex.props(styles.summary)}>
        <DueChip count={totalDue} />
        <span>
          {lib.cards.length} {lib.cards.length === 1 ? 'card' : 'cards'} · {todayCount} reviewed today
        </span>
      </div>
      <Screen>
        {resume && (
          <Section animate="rise">
            <Row
              as="button"
              icon={
                <span aria-hidden="true" {...stylex.props(styles.deckIcon, styles.deckTint(colors.orange))}>
                  <Sym name="reload" size={15} />
                </span>
              }
              label={resume.done ? 'Session complete' : 'Review in progress'}
              subtitle={resume.deck.name}
              detail={resume.done ? 'Done' : `${resume.left} left`}
              chevron
              xstyle={styles.actionRow}
              onClick={() => onResume(resume.deck)}
            />
          </Section>
        )}
        {lib.decks.length === 0 ? (
          <Placeholder>
            <Sym name="bookOutline" size={32} />
            <Text size="headline" weight="semibold">
              No decks yet
            </Text>
            <Text size="subheadline" color="secondary">
              Create a deck, then add cards to start reviewing.
            </Text>
            <Button variant="filled" onClick={(e) => onNew(e.currentTarget)}>
              New deck
            </Button>
          </Placeholder>
        ) : (
          <Section role="list" aria-label="Decks">
            {lib.decks.map((deck, i) => {
              const cards = deckCards(lib, deck.id)
              const due = dueQueue(cards, now).length
              return (
                <Row
                  as="button"
                  animate="row"
                  key={deck.id}
                  icon={<DeckIcon index={i} />}
                  label={<span {...stylex.props(styles.clamp)}>{deck.name}</span>}
                  subtitle={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
                  detail={due > 0 ? `${due} due` : undefined}
                  chevron
                  xstyle={[styles.actionRow, delay.ms(Math.min(i, 8) * 40)]}
                  onClick={() => onOpen(deck)}
                />
              )
            })}
          </Section>
        )}
      </Screen>
    </div>
  )
}

/**
 * The wide layout's deck rail: the same jobs as DecksScreen, dressed as a flat
 * sidebar inside the floating glass panel instead of grouped cards.
 */
function RailScreen({
  lib,
  now,
  resume,
  selectedDeckId,
  onNew,
  onOpen,
  onResume
}: {
  lib: Library
  now: number
  resume: { deck: Deck; left: number; done: boolean } | null
  selectedDeckId: string | undefined
  onNew: (trigger: HTMLElement) => void
  onOpen: (deck: Deck) => void
  onResume: (deck: Deck) => void
}) {
  const totalDue = dueQueue(lib.cards, now).length
  const todayCount = reviewsToday(lib, now)
  return (
    <nav aria-label="Decks" {...stylex.props(styles.rail)}>
      <div {...stylex.props(styles.railHead)}>
        <span {...stylex.props(styles.railTitle)}>Flashcards</span>
        <IconButton name="plus" aria-label="New deck" onClick={(e) => onNew(e.currentTarget)} xstyle={styles.hit} />
      </div>
      <div {...stylex.props(styles.railSummary)}>
        <DueChip count={totalDue} />
        <span>
          {lib.cards.length} {lib.cards.length === 1 ? 'card' : 'cards'} · {todayCount} today
        </span>
      </div>
      <ul {...stylex.props(styles.railList)}>
        {resume && (
          <li>
            <button type="button" {...stylex.props(styles.railRow)} onClick={() => onResume(resume.deck)}>
              <span aria-hidden="true" {...stylex.props(styles.deckIcon, styles.deckTint(colors.orange))}>
                <Sym name="reload" size={15} />
              </span>
              <span {...stylex.props(styles.railText)}>
                <span {...stylex.props(styles.railLabel)}>
                  {resume.done ? 'Session complete' : 'Review in progress'}
                </span>
                <span {...stylex.props(styles.railSub)}>{resume.deck.name}</span>
              </span>
              <span {...stylex.props(styles.railDetail)}>{resume.done ? 'Done' : `${resume.left} left`}</span>
              <span aria-hidden="true" {...stylex.props(styles.railChevron)}>
                <Sym name="forward" size={12} />
              </span>
            </button>
          </li>
        )}
        {lib.decks.length === 0 ? (
          <div {...stylex.props(styles.railEmpty)}>
            <Text size="subheadline" color="secondary">
              No decks yet
            </Text>
            <Button variant="filled" onClick={(e) => onNew(e.currentTarget)} xstyle={styles.hitBtn}>
              New deck
            </Button>
          </div>
        ) : (
          lib.decks.map((deck, i) => {
            const cards = deckCards(lib, deck.id)
            const due = dueQueue(cards, now).length
            const on = deck.id === selectedDeckId
            return (
              <li key={deck.id} {...stylex.props(animations.row, delay.ms(Math.min(i, 8) * 40))}>
                <button
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  {...stylex.props(styles.railRow, on && styles.railRowOn)}
                  onClick={() => onOpen(deck)}
                >
                  <DeckIcon index={i} />
                  <span {...stylex.props(styles.railText)}>
                    <span {...stylex.props(styles.railLabel)}>{deck.name}</span>
                    <span {...stylex.props(styles.railSub)}>
                      {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                    </span>
                  </span>
                  {due > 0 && <span {...stylex.props(styles.railDetail)}>{due} due</span>}
                  <span aria-hidden="true" {...stylex.props(styles.railChevron)}>
                    <Sym name="forward" size={12} />
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </nav>
  )
}

function DeckScreen({
  lib,
  deck,
  review,
  now,
  wide,
  onBack,
  onRename,
  onNewCard,
  onEditCard,
  onStartReview,
  onAskDelete
}: {
  lib: Library
  deck: Deck
  review: ReviewSession | null
  now: number
  wide: boolean
  onBack?: () => void
  onRename: (trigger: HTMLElement) => void
  onNewCard: (trigger: HTMLElement) => void
  onEditCard: (cardId: string, trigger: HTMLElement) => void
  onStartReview: () => void
  onAskDelete: (trigger: HTMLElement) => void
}) {
  const cards = deckCards(lib, deck.id)
  const due = dueQueue(cards, now).length
  const reviewing = review && review.deckId === deck.id && !review.finished
  return (
    <Page
      title={
        <>
          {!wide && onBack && (
            <button type="button" aria-label="Back" {...stylex.props(styles.backBtn)} onClick={onBack}>
              <Sym name="back" size={20} />
            </button>
          )}
          <span {...stylex.props(styles.clamp)}>{deck.name}</span>
          <Title variant="accessory">
            <IconButton
              name="compose"
              aria-label="Rename deck"
              onClick={(e) => onRename(e.currentTarget)}
              xstyle={styles.hit}
            />
          </Title>
        </>
      }
    >
      <Section>
        <Row
          icon={
            <span aria-hidden="true" {...stylex.props(styles.deckIcon, styles.deckTint(colors.blue))}>
              <Sym name="checklist" size={15} />
            </span>
          }
          label="Due now"
          subtitle={reviewing ? `${review.queue.length} left in the open session` : 'Cards waiting for review'}
          detail={`${due}`}
        />
        <Row
          as="button"
          icon={
            <span aria-hidden="true" {...stylex.props(styles.deckIcon, styles.deckTint(colors.green))}>
              <Sym name="reload" size={15} />
            </span>
          }
          label={reviewing ? 'Resume review' : 'Review'}
          subtitle={reviewing ? 'Pick up where you left off' : due ? 'Study the due queue' : 'Nothing is due'}
          chevron
          disabled={!reviewing && due === 0}
          xstyle={styles.actionRow}
          onClick={onStartReview}
        />
      </Section>
      <Section role="list" aria-label="Cards">
        <Row
          as="button"
          icon={
            <span aria-hidden="true" {...stylex.props(styles.deckIcon, styles.deckTint(colors.blue))}>
              <Sym name="plus" size={15} />
            </span>
          }
          label="New card"
          xstyle={styles.actionRow}
          onClick={(e) => onNewCard(e.currentTarget)}
        />
        {cards.map((card, i) => (
          <Row
            as="button"
            animate="row"
            key={card.id}
            label={<span {...stylex.props(styles.clamp)}>{card.front}</span>}
            subtitle={`${dueLabel(card, now)} · ${card.reviews} ${card.reviews === 1 ? 'review' : 'reviews'}`}
            chevron
            xstyle={[styles.actionRow, delay.ms(Math.min(i + 1, 8) * 40)]}
            onClick={(e) => onEditCard(card.id, e.currentTarget)}
          />
        ))}
        {cards.length === 0 && <Row label="No cards yet" subtitle="Add the first card to start reviewing this deck." />}
      </Section>
      <Section>
        <Row
          as="button"
          label="Delete deck"
          subtitle={`Removes ${cards.length} ${cards.length === 1 ? 'card' : 'cards'} and their history`}
          xstyle={[styles.actionRow, styles.danger]}
          onClick={(e) => onAskDelete(e.currentTarget)}
        />
      </Section>
    </Page>
  )
}

const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: 'again', label: 'Again', tone: colors.red },
  { grade: 'good', label: 'Good', tone: colors.blue },
  { grade: 'easy', label: 'Easy', tone: colors.green }
]

function ReviewScreen({
  lib,
  deck,
  review,
  wide,
  onLeave,
  onEnd,
  onReveal,
  onGrade,
  onFinish
}: {
  lib: Library
  deck: Deck
  review: ReviewSession
  wide: boolean
  onLeave: () => void
  onEnd: () => void
  onReveal: () => void
  onGrade: (grade: Grade) => void
  onFinish: () => void
}) {
  const card = currentCard(lib, review.deckId)
  const left = review.queue.length
  const total = review.done + left
  const part = total === 0 ? 1 : review.done / total
  return (
    <Page
      title={
        <>
          {!wide && (
            <button type="button" aria-label="Leave review" {...stylex.props(styles.backBtn)} onClick={onLeave}>
              <Sym name="back" size={20} />
            </button>
          )}
          <span {...stylex.props(styles.clamp)}>{deck.name}</span>
          <Title variant="accessory">
            <IconButton name="close" aria-label="End session" onClick={onEnd} xstyle={styles.hit} />
          </Title>
        </>
      }
    >
      <div {...stylex.props(shared.column)}>
        <div role="status" {...stylex.props(styles.progress)}>
          <span>{review.finished ? 'Session complete' : `${left} ${left === 1 ? 'card' : 'cards'} left`}</span>
          <span>{review.done} graded</span>
        </div>
        <div {...stylex.props(styles.progressTrack)} aria-hidden="true">
          <div {...stylex.props(styles.progressFill(part))} />
        </div>
        {review.finished ? (
          <>
            <div {...stylex.props(styles.cardFace, styles.cardStill, styles.cardReveal)}>
              <span aria-hidden="true" {...stylex.props(animations.pop, styles.finishCheck)}>
                <Sym name="check" size={28} />
              </span>
              <span {...stylex.props(styles.doneCount)}>{review.finished.graded}</span>
              <span {...stylex.props(styles.cardHint)}>reviewed this session</span>
            </div>
            <div {...stylex.props(styles.gradeRow)}>
              <Button variant="filled" onClick={onFinish} xstyle={[styles.finishBtn, styles.hitBtn]}>
                Done
              </Button>
            </div>
          </>
        ) : !card ? (
          <div {...stylex.props(styles.cardFace, styles.cardStill)}>
            <span {...stylex.props(styles.cardFront)}>This card was removed</span>
            <span {...stylex.props(styles.cardHint)}>End the session to keep going.</span>
          </div>
        ) : (
          <>
            {review.revealed ? (
              <div
                key={`${card.id}:answer`}
                {...stylex.props(styles.cardFace, styles.cardStill, styles.cardReveal)}
                aria-live="polite"
              >
                <span {...stylex.props(styles.cardRecap)}>{card.front}</span>
                <hr {...stylex.props(styles.cardDivider)} />
                <span {...stylex.props(styles.cardBack)}>{card.back}</span>
              </div>
            ) : (
              <button
                key={card.id}
                type="button"
                {...stylex.props(styles.cardFace, animations.rise)}
                onClick={onReveal}
                aria-label={`Show answer for ${card.front}`}
              >
                <span {...stylex.props(styles.cardFront)}>{card.front}</span>
                <span {...stylex.props(styles.cardHint)}>Tap to reveal</span>
              </button>
            )}
            {review.revealed ? (
              <fieldset aria-label="Grade this card" {...stylex.props(styles.gradeRow)}>
                {GRADES.map(({ grade, label, tone }) => {
                  const interval = formatInterval(nextInterval(card, grade))
                  return (
                    <button
                      key={grade}
                      type="button"
                      aria-label={`${label}, next review in ${interval}`}
                      {...stylex.props(styles.gradeBtn, styles.gradeTone(tone))}
                      onClick={() => onGrade(grade)}
                    >
                      <span>{label}</span>
                      <span {...stylex.props(styles.gradeHint)}>{interval}</span>
                    </button>
                  )
                })}
                <span {...stylex.props(styles.gradeCaption)}>Grades set when this card returns.</span>
              </fieldset>
            ) : (
              <div {...stylex.props(styles.gradeRow)}>
                <Button variant="filled" onClick={onReveal} xstyle={[styles.finishBtn, styles.hitBtn]}>
                  Show answer
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  )
}

/** Wide-layout default: the day's review picture beside the deck rail. */
function OverviewScreen({ lib, now, onOpen }: { lib: Library; now: number; onOpen: (deck: Deck) => void }) {
  const due = lib.decks
    .map((deck, i) => ({ deck, i, cards: deckCards(lib, deck.id) }))
    .map((e) => ({ ...e, due: dueQueue(e.cards, now).length }))
  const total = due.reduce((n, e) => n + e.due, 0)
  const todayCount = reviewsToday(lib, now)
  return (
    <Page title="Today">
      <div {...stylex.props(styles.cardFace, styles.overviewCard)}>
        <span {...stylex.props(styles.doneCount)}>{total}</span>
        <span {...stylex.props(styles.cardHint)}>
          {total === 1 ? 'card due' : 'cards due'} · {todayCount} reviewed today
        </span>
      </div>
      {due.length > 0 && (
        <Section role="list" aria-label="Due by deck">
          {due.map(({ deck, i, cards, due: d }) => (
            <Row
              as="button"
              animate="row"
              key={deck.id}
              icon={<DeckIcon index={i} />}
              label={<span {...stylex.props(styles.clamp)}>{deck.name}</span>}
              subtitle={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
              detail={d > 0 ? `${d} due` : 'All caught up'}
              chevron
              xstyle={[styles.actionRow, delay.ms(Math.min(i, 8) * 40)]}
              onClick={() => onOpen(deck)}
            />
          ))}
        </Section>
      )}
    </Page>
  )
}

function EditorSheet({
  draft,
  lib,
  onChange,
  onClose,
  onSave,
  onDeleteCard,
  dimmed,
  opener
}: {
  draft: Draft
  lib: Library
  onChange: (patch: Partial<Draft>) => void
  onClose: () => void
  onSave: () => void
  onDeleteCard: () => void
  /** True while a deck confirmation sits above this sheet: trap off, content inert. */
  dimmed: boolean
  /** The element that published the draft; focus returns to it on close. */
  opener: HTMLElement | null
}) {
  const [confirming, setConfirming] = useState(false)
  const editBox = useRef<HTMLDivElement>(null)
  const deleteBtn = useRef<HTMLButtonElement>(null)
  const confirmCancel = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  // One trap for the whole sheet: the confirm face swaps the box's children,
  // so the same trap contains whichever face is showing. While a deck
  // confirmation sits above, this layer sleeps instead of sharing the keydown.
  useFocusTrap(editBox, !dimmed, 'first', opener)
  // One escape layer for the whole sheet: on the confirm face it cancels the
  // face, on the edit face it closes the editor - before the SDK's go-home.
  // While dimmed (a deck confirmation above) this entry sleeps so Escape
  // peels the top visual layer first.
  const confirmingRef = useRef(confirming)
  confirmingRef.current = confirming
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(
    () =>
      dimmed
        ? undefined
        : pushEscape(() => {
            if (confirmingRef.current) setConfirming(false)
            else onCloseRef.current()
          }),
    [dimmed]
  )
  // The destructive face opens on Cancel - the safe default - and cancelling
  // it lands focus back on the same Delete button that was used.
  useEffect(() => {
    if (confirming) confirmCancel.current?.focus()
    if (wasConfirming.current && !confirming) deleteBtn.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])
  const isDeck = draft.kind === 'deck-new' || draft.kind === 'deck-rename'
  const title =
    draft.kind === 'deck-new'
      ? 'New deck'
      : draft.kind === 'deck-rename'
        ? 'Rename deck'
        : draft.kind === 'card-new'
          ? 'New card'
          : confirming
            ? 'Delete card'
            : 'Edit card'
  const canSave = isDeck ? draft.name.trim().length > 0 : draft.front.trim().length > 0 && draft.back.trim().length > 0
  const editingCard = draft.kind === 'card-edit' && draft.cardId ? lib.cards.find((c) => c.id === draft.cardId) : null
  return (
    <Sheet
      open
      onClose={() => {
        if (confirming) setConfirming(false)
        else onClose()
      }}
      aria-label={title}
    >
      <div
        ref={editBox}
        key={confirming ? 'confirm' : 'edit'}
        inert={dimmed}
        {...stylex.props(styles.editor, shared.swap)}
      >
        <Text as="h2" size="headline" weight="semibold">
          {title}
        </Text>
        {confirming && editingCard ? null : isDeck ? (
          <label htmlFor="deck-name" {...stylex.props(styles.field)}>
            Name
            <TextField
              id="deck-name"
              autoFocus
              value={draft.name}
              placeholder="Deck name"
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </label>
        ) : (
          <>
            <label htmlFor="card-front" {...stylex.props(styles.field)}>
              Front
              <TextField
                id="card-front"
                autoFocus
                multiline
                value={draft.front}
                placeholder="Prompt or question"
                onChange={(e) => onChange({ front: e.target.value })}
              />
            </label>
            <label htmlFor="card-back" {...stylex.props(styles.field)}>
              Back
              <TextField
                id="card-back"
                multiline
                value={draft.back}
                placeholder="Answer"
                onChange={(e) => onChange({ back: e.target.value })}
              />
              <span {...stylex.props(styles.cardHint)}>Revealed when the card flips.</span>
            </label>
          </>
        )}
        {confirming && editingCard ? (
          <div {...stylex.props(styles.confirmInner)}>
            <span {...stylex.props(styles.confirmText)}>
              "{editingCard.front}" and its review history will be removed. This cannot be undone.
            </span>
            <div {...stylex.props(styles.editorActions)}>
              <Button variant="filled" xstyle={[styles.hitBtn, styles.dangerFill]} onClick={onDeleteCard}>
                Delete card
              </Button>
              <Button ref={confirmCancel} variant="plain" xstyle={styles.hitBtn} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div {...stylex.props(styles.editorActions)}>
            <Button variant="filled" disabled={!canSave} xstyle={styles.hitBtn} onClick={onSave}>
              Save
            </Button>
            <Button variant="plain" xstyle={styles.hitBtn} onClick={onClose}>
              Cancel
            </Button>
            {editingCard && (
              <Button
                ref={deleteBtn}
                variant="plain"
                xstyle={[styles.hitBtn, styles.danger]}
                onClick={() => setConfirming(true)}
              >
                Delete card
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function Flashcards() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  // The library lives in bounded records under the per-key limit; the store
  // owns migration from the legacy single document, write ordering, retries
  // and the watch that keeps both display copies in sync.
  const store = useMemo(() => new LibraryStore(os.storage, os.storage.limits), [])
  const stored = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const ui = useKV(os.session, 'ui')
  const draft = useKV(os.session, 'draft')
  // A slow tick keeps "In 10m" captions and due chips honest while a page sits
  // open; it only re-renders this display's copy and writes nothing. Rule 2:
  // the hidden copy of the app rests - no interval lives there.
  const [, setBeat] = useState(0)
  useEffect(() => {
    if (!view.visible) return
    const timer = setInterval(() => setBeat((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [view.visible])
  // Signal readiness once hydration or migration resolves - either to a ready
  // view or an error state - so the shell never launches into an unsynced
  // library. An error still reports ready: the app renders and explains it.
  const readySent = useRef(false)
  useEffect(() => {
    if (readySent.current || stored.status === 'hydrating') return
    readySent.current = true
    requestAnimationFrame(() => os.ready())
  }, [stored.status])
  // Dark Mode flips this light app into the kit's dark theme; the switch arrives
  // as a device event the way Settings reads it.
  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])

  const lib = stored.lib
  const draftState = parseDraft(draft.value)
  const now = Date.now()
  // Root-held confirm state. The deck confirmation pins its target as a
  // snapshot: the content and the Delete button act on the captured deck, so
  // a peer navigation update can never retitle a live prompt against another
  // deck, and the snapshot keeps the named card readable through the Sheet's
  // 200ms exit after the deck is gone. `done` marks the closing animation so
  // the outgoing actions stay inert while the card fades.
  const [deckConfirm, setDeckConfirm] = useState<{ deckId: string; name: string; count: number } | null>(null)
  const [deckConfirmDone, setDeckConfirmDone] = useState(false)
  const deckTrigger = useRef<HTMLElement | null>(null)
  const editorTrigger = useRef<HTMLElement | null>(null)

  // Any live session drives the resume row and the cold-launch landing.
  const live = Object.values(lib.reviews).find((r) => !r.finished && getDeck(lib, r.deckId)) ?? null

  // A fresh launch that lands on a waiting review commits that view so later
  // renders keep honouring it; without the write the session sentinel would
  // re-derive 'decks' the moment the session finishes and skip the recap.
  const waiting = live ? live.deckId : null
  useEffect(() => {
    if (ui.status === 'ready' && ui.value === null && waiting)
      ui.set(JSON.stringify({ v: 1, view: 'review', deckId: waiting }))
  }, [ui, waiting])

  // Fresh launches (nothing written to the session key yet) land on a waiting
  // review instead of the deck list; once the user navigates, the written value
  // is honoured as-is.
  const requested =
    ui.value === null
      ? live
        ? ({ v: 1, view: 'review', deckId: live.deckId } as const)
        : ({ v: 1, view: 'decks' } as const)
      : parseUi(ui.value)
  const deck = requested.deckId ? getDeck(lib, requested.deckId) : undefined
  // The session for the deck on screen, if one was ever started for it.
  const review = deck ? (lib.reviews[deck.id] ?? null) : null
  const screen: View = !deck
    ? 'decks'
    : requested.view === 'review'
      ? review
        ? 'review'
        : 'deck'
      : requested.view === 'deck'
        ? 'deck'
        : 'decks'

  const save = (next: Library) => store.save(next)
  const go = (next: UiState) => ui.set(JSON.stringify(next))
  const openDraft = (next: Omit<Draft, 'v' | 'name' | 'front' | 'back'> & Partial<Draft>, el?: HTMLElement) => {
    // The opener's element is remembered before the draft commits so the
    // editor trap can hand focus back when the sheet closes.
    editorTrigger.current = el ?? null
    draft.set(JSON.stringify({ v: 1, name: '', front: '', back: '', ...next }))
  }
  const closeDraft = () => draft.del()

  const resumeDeck = live ? getDeck(lib, live.deckId) : undefined
  const resumeInfo = resumeDeck && live ? { deck: resumeDeck, left: live.queue.length, done: false } : null

  const decksScreen = (
    <DecksScreen
      lib={lib}
      now={now}
      resume={resumeInfo}
      onNew={(el) => openDraft({ kind: 'deck-new' }, el)}
      onOpen={(d) => go({ v: 1, view: 'deck', deckId: d.id })}
      onResume={(d) => go({ v: 1, view: 'review', deckId: d.id })}
    />
  )

  const detailScreen = deck ? (
    screen === 'review' && review ? (
      <ReviewScreen
        lib={lib}
        deck={deck}
        review={review}
        wide={wide}
        onLeave={() => go({ v: 1, view: 'deck', deckId: deck.id })}
        onEnd={() => {
          save(abandonReview(lib, deck.id))
          go({ v: 1, view: 'deck', deckId: deck.id })
        }}
        onReveal={() => save(revealReview(lib, deck.id))}
        onGrade={(g) => save(gradeReview(lib, deck.id, g, Date.now()))}
        onFinish={() => {
          save(abandonReview(lib, deck.id))
          go({ v: 1, view: 'deck', deckId: deck.id })
        }}
      />
    ) : (
      <DeckScreen
        lib={lib}
        deck={deck}
        review={review}
        now={now}
        wide={wide}
        onBack={() => go({ v: 1, view: 'decks' })}
        onRename={(el) => openDraft({ kind: 'deck-rename', deckId: deck.id, name: deck.name }, el)}
        onNewCard={(el) => openDraft({ kind: 'card-new', deckId: deck.id }, el)}
        onEditCard={(cardId, el) => {
          const card = lib.cards.find((c) => c.id === cardId)
          if (card) openDraft({ kind: 'card-edit', cardId, front: card.front, back: card.back }, el)
        }}
        onStartReview={() => {
          if (!(review && !review.finished)) save(startReview(lib, deck.id, Date.now()))
          go({ v: 1, view: 'review', deckId: deck.id })
        }}
        onAskDelete={(el) => {
          deckTrigger.current = el
          // The target is pinned now: a shared-navigation update can retitle
          // the deck under the sheet, but only this deck is ever deleted.
          setDeckConfirm({ deckId: deck.id, name: deck.name, count: deckCards(lib, deck.id).length })
          setDeckConfirmDone(false)
        }}
      />
    )
  ) : null

  const commitDraft = () => {
    if (!draftState) return
    const at = Date.now()
    let next: Library | null = null
    if (draftState.kind === 'deck-new' && draftState.name.trim()) next = addDeck(lib, draftState.name, at)
    else if (draftState.kind === 'deck-rename' && draftState.deckId && draftState.name.trim())
      next = renameDeck(lib, draftState.deckId, draftState.name)
    else if (draftState.kind === 'card-new' && draftState.deckId && draftState.front.trim() && draftState.back.trim())
      next = addCard(lib, draftState.deckId, draftState.front, draftState.back, at)
    else if (draftState.kind === 'card-edit' && draftState.cardId && draftState.front.trim() && draftState.back.trim())
      next = updateCard(lib, draftState.cardId, draftState.front, draftState.back)
    if (!next) return
    // The draft outlives the save: it clears only after the write is
    // acknowledged AND the committed view carries exactly this library, so a
    // rejected or superseded persistence leaves the editor open on the
    // typed content instead of implying it saved.
    if (save(next)) setPendingCommit(next)
  }

  const [pendingCommit, setPendingCommit] = useState<Library | null>(null)
  useEffect(() => {
    if (!pendingCommit) return
    if (stored.status === 'ready') {
      const committed = serializeLibrary(stored.lib) === serializeLibrary(pendingCommit)
      setPendingCommit(null)
      if (committed) draft.del()
    } else if (stored.status === 'error') {
      setPendingCommit(null)
    }
  }, [pendingCommit, stored, draft])

  const draftValid =
    draftState &&
    (draftState.kind === 'deck-new' || (draftState.deckId ? !!getDeck(lib, draftState.deckId) : true)) &&
    (draftState.cardId ? lib.cards.some((c) => c.id === draftState.cardId) : true)

  const deckSheetOpen = deckConfirm !== null && !deckConfirmDone
  const editorOpen = !!(draftValid && draftState)
  const modalOpen = deckSheetOpen || editorOpen
  return (
    <main
      ref={rootRef}
      data-app="flashcards"
      data-display={view.display}
      data-screen={screen}
      {...stylex.props(darkMode ? dark : light, styles.root)}
    >
      <div {...stylex.props(styles.appBody)} inert={modalOpen}>
        {stored.status === 'hydrating' ? (
          <Placeholder>
            <Text color="secondary">Loading…</Text>
          </Placeholder>
        ) : wide ? (
          <section {...stylex.props(styles.stage)}>
            <RailScreen
              lib={lib}
              now={now}
              resume={resumeInfo}
              selectedDeckId={deck?.id}
              onNew={(el) => openDraft({ kind: 'deck-new' }, el)}
              onOpen={(d) => go({ v: 1, view: 'deck', deckId: d.id })}
              onResume={(d) => go({ v: 1, view: 'review', deckId: d.id })}
            />
            <div key={`${screen}:${deck?.id ?? 'today'}`} {...stylex.props(styles.detail, shared.swap)}>
              {detailScreen ?? (
                <OverviewScreen lib={lib} now={now} onOpen={(d) => go({ v: 1, view: 'deck', deckId: d.id })} />
              )}
            </div>
          </section>
        ) : (
          <Push open={screen !== 'decks'} sheet={detailScreen ?? <div />}>
            {decksScreen}
          </Push>
        )}
        <small role="status" {...stylex.props(styles.status)}>
          {stored.status === 'saving'
            ? 'Saving…'
            : stored.status === 'error'
              ? 'Changes may not have saved'
              : stored.status === 'hydrating'
                ? ''
                : 'Saved on this device'}
        </small>
      </div>
      {draftValid && draftState && (
        <EditorSheet
          key={`${draftState.kind}:${draftState.cardId ?? draftState.deckId ?? ''}`}
          draft={draftState}
          lib={lib}
          onChange={(patch) => draft.set(JSON.stringify({ ...draftState, ...patch }))}
          onClose={closeDraft}
          onSave={commitDraft}
          dimmed={deckSheetOpen}
          opener={editorTrigger.current}
          onDeleteCard={() => {
            if (draftState.cardId) save(removeCard(lib, draftState.cardId))
            closeDraft()
          }}
        />
      )}
      <DestructiveSheet
        open={deckSheetOpen}
        busy={deckConfirmDone}
        label={deckConfirm ? `Delete ${deckConfirm.name}` : 'Delete deck'}
        onClose={() => setDeckConfirmDone(true)}
        restoreTo={deckTrigger.current}
      >
        {deckConfirm && (
          <>
            <Text as="h2" size="headline" weight="semibold">
              Delete "{deckConfirm.name}"?
            </Text>
            <span {...stylex.props(styles.confirmText)}>
              This removes the deck, its {deckConfirm.count} {deckConfirm.count === 1 ? 'card' : 'cards'} and their
              review history.
            </span>
            <div {...stylex.props(styles.editorActions)}>
              <Button
                variant="filled"
                xstyle={[styles.hitBtn, styles.dangerFill]}
                onClick={() => {
                  save(removeDeck(lib, deckConfirm.deckId))
                  setDeckConfirmDone(true)
                  go({ v: 1, view: 'decks' })
                }}
              >
                Delete deck
              </Button>
              <Button variant="plain" xstyle={styles.hitBtn} onClick={() => setDeckConfirmDone(true)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </DestructiveSheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Flashcards />)
