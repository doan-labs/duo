// Phone's root: five tabs behind the floating bar, a pushed card per tab, and
// the call surfaces stacked above everything. Every list and switch lives in
// the shared store, so both displays draw the same phone.

import type { Os } from '@doan-labs/duo-sdk'
import { Push, Screen } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { CallScreen, IncomingScreen, Picker, ReturnPill } from './call.tsx'
import { ContactsList } from './contacts.tsx'
import type { Contact, Recent, Voicemail } from './data.ts'
import { CallDetail, ContactDetail, ContactForm, Toast, useToast } from './detail.tsx'
import { Favorites } from './favorites.tsx'
import { Keypad } from './keypad.tsx'
import { Recents } from './recents.tsx'
import { SearchBar, SearchResults } from './search.tsx'
import { blank, place, usePhone, useShared } from './store.ts'
import { styles } from './styles.ts'
import { Voicemails } from './voicemail.tsx'

const TABS = [
  ['Favorites', 'starFill'],
  ['Recents', 'clockFill'],
  ['Contacts', 'personFill'],
  ['Keypad', 'keypad'],
  ['Voicemail', 'voicemail']
] as const

type Draft = { c: Contact; isNew: boolean; linkRecent?: string }

export const Phone = ({ os }: { os: Os }) => {
  const {
    book,
    contacts,
    favorites,
    recents,
    voicemails,
    calls,
    incoming,
    playback,
    save,
    remove,
    toggleFavorite,
    moveFavorite,
    toggleBlocked,
    removeRecent,
    clearRecents,
    linkRecent,
    removeVoicemail
  } = usePhone()

  const [tab, setTab] = useShared('tab', 3)
  const [favEdit, setFavEdit] = useShared('favEdit', false)
  const [recEdit, setRecEdit] = useShared('recEdit', false)
  const [filter, setFilter] = useShared<'All' | 'Missed'>('recFilter', 'All')
  // What each list has pushed: Favorites and Contacts hold a contact id,
  // Recents a recent id, Voicemail the expanded message.
  const [view0, setView0] = useShared('view0', '')
  const [view1, setView1] = useShared('view1', '')
  const [view2, setView2] = useShared('view2', '')
  const [vmOpen, setVmOpen] = useShared('view4', '')
  const [q, setQ] = useShared('q', '')
  const [callHidden, setCallHidden] = useShared('callHidden', false)
  // '' closed; 'add' adds a line to the live call, 'fav' picks a new favorite,
  // 'exist:<id>' links an unknown recent to a contact.
  const [pick, setPick] = useShared('pick', '')
  const [draft, setDraft] = useState<Draft | null>(null)
  const { toast, closing, setToast } = useToast()

  const live = calls.filter((c) => c.phase !== 'ended')
  const front = live.find((c) => c.phase === 'active') ?? live[0]
  const held = calls.find((c) => c.phase === 'held')
  const unheard = voicemails.filter((v) => !v.heard).length

  useEffect(() => {
    if (!live.length) setCallHidden(false)
  }, [live.length, setCallHidden])

  // A pushed card id whose row vanished (deleted contact, cleared log) drops
  // the push rather than rendering an empty card.
  const contact0 = contacts.find((c) => c.id === view0)
  const contact2 = contacts.find((c) => c.id === view2)
  const recent = recents.find((r) => r.id === view1)
  useEffect(() => {
    if (view0 && !contact0) setView0('')
    if (view2 && !contact2) setView2('')
    if (view1 && !recent) setView1('')
    if (vmOpen && !voicemails.some((v) => v.id === vmOpen)) setVmOpen('')
  }, [view0, contact0, view2, contact2, view1, recent, vmOpen, voicemails, setView0, setView2, setView1, setVmOpen])

  const edit = (c: Contact, isNew: boolean, linkRecent?: string) => setDraft({ c, isNew, linkRecent })
  const onSave = (c: Contact) => {
    save(c)
    if (draft?.linkRecent) linkRecent(draft.linkRecent, c.id)
    setDraft(null)
  }
  const pickContact = (c: Contact) => {
    if (pick === 'add') place0(c)
    else if (pick === 'fav') !c.favorite && toggleFavorite(c.id)
    else if (pick.startsWith('exist:')) linkRecent(pick.slice(6), c.id)
    setPick('')
  }
  const place0 = (c: Contact) => place({ number: c.phone, contactId: c.id })

  // Search results jump across tabs: each hit lands on the card that row owns.
  const openContact = (c: Contact) => {
    setQ('')
    setTab(2)
    setView2(c.id)
  }
  const openRecent = (r: Recent) => {
    setQ('')
    setTab(1)
    setView1(r.id)
  }
  const openVoicemail = (v: Voicemail) => {
    setQ('')
    setTab(4)
    setVmOpen(v.id)
  }

  const hideCall = (intent: 'facetime' | 'contacts') => {
    if (intent === 'contacts') {
      setCallHidden(true)
      setTab(2)
      setQ('')
    } else {
      os.open('FaceTime', front?.name ?? '')
    }
  }

  const shareVoicemail = (v: Voicemail) => {
    void navigator.clipboard?.writeText(`${v.name} voicemail: ${v.transcript}`).catch(() => {})
    setToast('Voicemail copied')
  }

  // Blocking an unknown number invents the blocked contact iOS keeps silently.
  const block = (r: Recent, contact: Contact | undefined) => {
    if (contact) return toggleBlocked(contact.id)
    const c = { ...blank(), phone: r.number, blocked: true }
    save(c)
    linkRecent(r.id, c.id)
  }

  const searching = !!q.trim()
  const results = (
    <SearchResults
      q={q}
      book={book}
      recents={recents}
      voicemails={voicemails}
      onContact={openContact}
      onRecent={openRecent}
      onVoicemail={openVoicemail}
    />
  )

  return (
    // Phone is the one dark app in the dock: the UIKit dark appearance, so rows,
    // separators and secondary labels inside it read against black.
    <Screen xstyle={[dark, styles.root]}>
      <div {...stylex.props(styles.panes)}>
        <Screen xstyle={[styles.pane, tab !== 0 && shared.hide]}>
          <Push
            open={!!contact0}
            sheet={
              contact0 && (
                <ContactDetail
                  contact={contact0}
                  os={os}
                  onBack={() => setView0('')}
                  onEdit={() => edit(contact0, false)}
                  onToggleFavorite={() => toggleFavorite(contact0.id)}
                  onToggleBlocked={() => toggleBlocked(contact0.id)}
                  onDelete={() => {
                    remove(contact0.id)
                    setView0('')
                  }}
                />
              )
            }
          >
            <Favorites
              favorites={favorites}
              editing={favEdit}
              onEdit={setFavEdit}
              onInfo={setView0}
              onAdd={() => setPick('fav')}
              onRemove={toggleFavorite}
              onMove={moveFavorite}
            />
          </Push>
        </Screen>
        <Screen xstyle={[styles.pane, tab !== 1 && shared.hide]}>
          <Push
            open={!!recent}
            sheet={
              recent && (
                <CallDetail
                  recent={recent}
                  contact={contacts.find((c) => c.id === recent.contactId)}
                  os={os}
                  onBack={() => setView1('')}
                  onDelete={() => {
                    removeRecent(recent.id)
                    setView1('')
                  }}
                  onNewContact={() => edit({ ...blank(), phone: recent.number }, true, recent.id)}
                  onAddToContact={() => setPick(`exist:${recent.id}`)}
                  onToggleBlocked={() => {
                    block(
                      recent,
                      contacts.find((c) => c.id === recent.contactId)
                    )
                    setView1('')
                  }}
                />
              )
            }
          >
            <SearchBar q={q} onQuery={setQ} />
            {searching ? (
              results
            ) : (
              <Recents
                recents={recents}
                filter={filter}
                onFilter={setFilter}
                editing={recEdit}
                onEdit={setRecEdit}
                onClear={clearRecents}
                onDelete={removeRecent}
                onInfo={setView1}
              />
            )}
          </Push>
        </Screen>
        <Screen xstyle={[styles.pane, tab !== 2 && shared.hide]}>
          <Push
            open={!!contact2}
            sheet={
              contact2 && (
                <ContactDetail
                  contact={contact2}
                  os={os}
                  onBack={() => setView2('')}
                  onEdit={() => edit(contact2, false)}
                  onToggleFavorite={() => toggleFavorite(contact2.id)}
                  onToggleBlocked={() => toggleBlocked(contact2.id)}
                  onDelete={() => {
                    remove(contact2.id)
                    setView2('')
                  }}
                />
              )
            }
          >
            <SearchBar q={q} onQuery={setQ} />
            {searching ? (
              results
            ) : (
              <ContactsList contacts={contacts} onOpen={setView2} onNew={() => edit(blank(), true)} />
            )}
          </Push>
        </Screen>
        <div {...stylex.props(styles.pane, tab !== 3 && shared.hide)}>
          <Keypad book={book} />
        </div>
        <Screen xstyle={[styles.pane, tab !== 4 && shared.hide]}>
          <SearchBar q={q} onQuery={setQ} />
          {searching ? (
            results
          ) : (
            <Voicemails
              voicemails={voicemails}
              open={vmOpen}
              playback={playback}
              onOpen={setVmOpen}
              onDelete={removeVoicemail}
              onShare={shareVoicemail}
            />
          )}
        </Screen>
      </div>
      <nav aria-label="Phone" {...stylex.props(styles.bar)}>
        {TABS.map(([label, glyph], i) => (
          <button
            key={label}
            type="button"
            aria-pressed={tab === i}
            {...stylex.props(styles.tab, tab === i && styles.tabOn)}
            onClick={() => {
              setTab(i)
              setQ('')
            }}
          >
            <span {...stylex.props(styles.tabGlyph)}>
              <Sym name={glyph} size={24} />
              {label === 'Voicemail' && !!unheard && <span {...stylex.props(styles.badge)}>{unheard}</span>}
            </span>
            {label}
          </button>
        ))}
      </nav>
      {front && callHidden && <ReturnPill call={front} onShow={() => setCallHidden(false)} />}
      {calls.map((c) =>
        (c === front && !callHidden) || c.phase === 'ended' ? (
          <CallScreen
            key={c.id}
            call={c}
            held={c === front && held !== c ? held : undefined}
            onHide={hideCall}
            onAdd={() => setPick('add')}
          />
        ) : null
      )}
      {incoming && <IncomingScreen inc={incoming} />}
      {!!pick && (
        <Picker
          book={book}
          title={pick === 'add' ? 'Add Call' : pick === 'fav' ? 'Add Favorite' : 'Add to Existing Contact'}
          onPick={pickContact}
          onClose={() => setPick('')}
        />
      )}
      <ContactForm
        draft={draft?.c ?? null}
        isNew={draft?.isNew ?? false}
        onSave={onSave}
        onClose={() => setDraft(null)}
      />
      <Toast toast={toast} closing={closing} />
    </Screen>
  )
}
