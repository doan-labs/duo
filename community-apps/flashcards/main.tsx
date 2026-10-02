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
import { animations, delay, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
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
  parseLibrary,
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
import { styles } from './styles.ts'

/** Session-only UI state: the pane stack and the open editor draft. Decks, cards,
 * due state and the in-progress review live in the single 'library' storage
 * document instead, so the fold and a relaunch both land on the same truth. */
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
  onNew: () => void
  onOpen: (deck: Deck) => void
  onResume: (deck: Deck) => void
}) {
  const totalDue = dueQueue(lib.cards, now).length
  const todayCount = reviewsToday(lib.history, now)
  return (
    <div {...stylex.props(shared.column)}>
      <Title as="h1">
        Flashcards
        <Title variant="accessory">
          <IconButton name="plus" aria-label="New deck" onClick={onNew} />
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
            <Button variant="filled" onClick={onNew}>
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
  onDelete
}: {
  lib: Library
  deck: Deck
  review: ReviewSession | null
  now: number
  wide: boolean
  onBack?: () => void
  onRename: () => void
  onNewCard: () => void
  onEditCard: (cardId: string) => void
  onStartReview: () => void
  onDelete: () => void
}) {
  const cards = deckCards(lib, deck.id)
  const due = dueQueue(cards, now).length
  const [confirming, setConfirming] = useState(false)
  const reviewing = review && review.deckId === deck.id && !review.finished
  return (
    <Page
      title={
        <>
          <span {...stylex.props(styles.clamp)}>{deck.name}</span>
          <Title variant="accessory">
            <IconButton name="compose" aria-label="Rename deck" onClick={onRename} />
          </Title>
        </>
      }
      back={wide ? undefined : onBack}
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
          onClick={onNewCard}
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
            onClick={() => onEditCard(card.id)}
          />
        ))}
        {cards.length === 0 && <Row label="No cards yet" subtitle="Add the first card to start reviewing this deck." />}
      </Section>
      <Section>
        <Row
          as="button"
          label={confirming ? 'Tap again to delete deck' : 'Delete deck'}
          subtitle={confirming ? 'This removes the deck, its cards and their history.' : undefined}
          xstyle={[styles.actionRow, styles.danger]}
          onClick={() => (confirming ? onDelete() : setConfirming(true))}
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
  const card = currentCard(lib)
  const left = review.queue.length
  const total = review.done + left
  const part = total === 0 ? 1 : review.done / total
  return (
    <Page
      title={
        <>
          <span {...stylex.props(styles.clamp)}>{deck.name}</span>
          <Title variant="accessory">
            <IconButton name="close" aria-label="End session" onClick={onEnd} />
          </Title>
        </>
      }
      back={wide ? undefined : onLeave}
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
              <Button variant="filled" onClick={onFinish} xstyle={styles.finishBtn}>
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
                <Button variant="filled" onClick={onReveal} xstyle={styles.finishBtn}>
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
  const todayCount = reviewsToday(lib.history, now)
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
  onDeleteCard
}: {
  draft: Draft
  lib: Library
  onChange: (patch: Partial<Draft>) => void
  onClose: () => void
  onSave: () => void
  onDeleteCard: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const isDeck = draft.kind === 'deck-new' || draft.kind === 'deck-rename'
  const title =
    draft.kind === 'deck-new'
      ? 'New deck'
      : draft.kind === 'deck-rename'
        ? 'Rename deck'
        : draft.kind === 'card-new'
          ? 'New card'
          : 'Edit card'
  const canSave = isDeck ? draft.name.trim().length > 0 : draft.front.trim().length > 0 && draft.back.trim().length > 0
  const editingCard = draft.kind === 'card-edit' && draft.cardId ? lib.cards.find((c) => c.id === draft.cardId) : null
  return (
    <Sheet open onClose={onClose} aria-label={title}>
      <div {...stylex.props(styles.editor)}>
        <Text as="h2" size="headline" weight="semibold">
          {title}
        </Text>
        {isDeck ? (
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
        <div {...stylex.props(styles.editorActions)}>
          <Button variant="filled" disabled={!canSave} onClick={onSave}>
            Save
          </Button>
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          {editingCard && (
            <Button
              variant="plain"
              xstyle={styles.danger}
              onClick={() => (confirming ? onDeleteCard() : setConfirming(true))}
            >
              {confirming ? 'Tap again to delete card' : 'Delete card'}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}

function Flashcards() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const stored = useKV(os.storage, 'library')
  const ui = useKV(os.session, 'ui')
  const draft = useKV(os.session, 'draft')
  // A slow tick keeps "In 10m" captions and due chips honest while a page sits
  // open; it only re-renders this display's copy and writes nothing.
  const [, setBeat] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setBeat((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [])
  // Signal readiness after React has committed the app's first frame.
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const lib = parseLibrary(stored.value)
  const draftState = parseDraft(draft.value)
  const now = Date.now()

  // The live session, only if its deck still exists on this copy.
  const review = lib.review && getDeck(lib, lib.review.deckId) ? lib.review : null

  // A fresh launch that lands on a waiting review commits that view so later
  // renders keep honouring it; without the write the session sentinel would
  // re-derive 'decks' the moment the session finishes and skip the recap.
  const waiting = review && !review.finished ? review.deckId : null
  useEffect(() => {
    if (ui.status === 'ready' && ui.value === null && waiting)
      ui.set(JSON.stringify({ v: 1, view: 'review', deckId: waiting }))
  }, [ui, waiting])

  // Fresh launches (nothing written to the session key yet) land on a waiting
  // review instead of the deck list; once the user navigates, the written value
  // is honoured as-is.
  const requested =
    ui.value === null
      ? review && !review.finished
        ? ({ v: 1, view: 'review', deckId: review.deckId } as const)
        : ({ v: 1, view: 'decks' } as const)
      : parseUi(ui.value)
  const deck = requested.deckId ? getDeck(lib, requested.deckId) : undefined
  const screen: View = !deck
    ? 'decks'
    : requested.view === 'review'
      ? review && review.deckId === deck.id
        ? 'review'
        : 'deck'
      : requested.view === 'deck'
        ? 'deck'
        : 'decks'

  const save = (next: Library) => void stored.set(serializeLibrary(next))
  const go = (next: UiState) => ui.set(JSON.stringify(next))
  const openDraft = (next: Omit<Draft, 'v' | 'name' | 'front' | 'back'> & Partial<Draft>) =>
    draft.set(JSON.stringify({ v: 1, name: '', front: '', back: '', ...next }))
  const closeDraft = () => draft.del()

  const resumeDeck = review ? getDeck(lib, review.deckId) : undefined
  const resumeInfo =
    resumeDeck && review ? { deck: resumeDeck, left: review.queue.length, done: !!review.finished } : null

  const decksScreen = (
    <DecksScreen
      lib={lib}
      now={now}
      resume={resumeInfo}
      onNew={() => openDraft({ kind: 'deck-new' })}
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
          save(abandonReview(lib))
          go({ v: 1, view: 'deck', deckId: deck.id })
        }}
        onReveal={() => save(revealReview(lib))}
        onGrade={(g) => save(gradeReview(lib, g, Date.now()))}
        onFinish={() => {
          save(abandonReview(lib))
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
        onRename={() => openDraft({ kind: 'deck-rename', deckId: deck.id, name: deck.name })}
        onNewCard={() => openDraft({ kind: 'card-new', deckId: deck.id })}
        onEditCard={(cardId) => {
          const card = lib.cards.find((c) => c.id === cardId)
          if (card) openDraft({ kind: 'card-edit', cardId, front: card.front, back: card.back })
        }}
        onStartReview={() => {
          if (!(review && review.deckId === deck.id && !review.finished)) save(startReview(lib, deck.id, Date.now()))
          go({ v: 1, view: 'review', deckId: deck.id })
        }}
        onDelete={() => {
          save(removeDeck(lib, deck.id))
          go({ v: 1, view: 'decks' })
        }}
      />
    )
  ) : null

  const commitDraft = () => {
    if (!draftState) return
    const at = Date.now()
    if (draftState.kind === 'deck-new' && draftState.name.trim()) save(addDeck(lib, draftState.name, at))
    else if (draftState.kind === 'deck-rename' && draftState.deckId && draftState.name.trim())
      save(renameDeck(lib, draftState.deckId, draftState.name))
    else if (draftState.kind === 'card-new' && draftState.deckId && draftState.front.trim() && draftState.back.trim())
      save(addCard(lib, draftState.deckId, draftState.front, draftState.back, at))
    else if (draftState.kind === 'card-edit' && draftState.cardId && draftState.front.trim() && draftState.back.trim())
      save(updateCard(lib, draftState.cardId, draftState.front, draftState.back))
    closeDraft()
  }

  const draftValid =
    draftState &&
    (draftState.kind === 'deck-new' || (draftState.deckId ? !!getDeck(lib, draftState.deckId) : true)) &&
    (draftState.cardId ? lib.cards.some((c) => c.id === draftState.cardId) : true)

  return (
    <main
      ref={rootRef}
      data-app="flashcards"
      data-display={view.display}
      data-screen={screen}
      {...stylex.props(light, styles.root)}
    >
      {stored.status === 'hydrating' ? (
        <Placeholder>
          <Text color="secondary">Loading…</Text>
        </Placeholder>
      ) : wide ? (
        <section {...stylex.props(styles.stage)}>
          <aside {...stylex.props(styles.rail)}>{decksScreen}</aside>
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
      {draftValid && draftState && (
        <EditorSheet
          key={`${draftState.kind}:${draftState.cardId ?? draftState.deckId ?? ''}`}
          draft={draftState}
          lib={lib}
          onChange={(patch) => draft.set(JSON.stringify({ ...draftState, ...patch }))}
          onClose={closeDraft}
          onSave={commitDraft}
          onDeleteCard={() => {
            if (draftState.cardId) save(removeCard(lib, draftState.cardId))
            closeDraft()
          }}
        />
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
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Flashcards />)
