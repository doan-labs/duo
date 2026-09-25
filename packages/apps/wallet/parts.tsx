// Wallet's shared pieces: the face-to-colour map, the card face plate, the
// search field, the tinted dot rows lead with, the add-pass sheet and the
// double-click pay sheet.

import type { FaceId, Pass, PassGroup } from '@doan-labs/duo-fixtures/wallet.ts'
import { addPass, charge } from '@doan-labs/duo-fixtures/wallet.ts'
import { Button, Row, Sheet, Sym, type SymProps, TextField } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { closeAdd, closePay, confirmPay, goToPath, setAddGroup, useAdd, useBook, usePay } from './store.ts'
import { styles } from './styles.ts'

/** Each face's gradient plate and accent colour. */
export const FACES: Record<FaceId, { bg: string; accent: string }> = {
  titanium: { bg: appAppearance.walletAppleCard, accent: colors.grey3Dark },
  cash: { bg: appAppearance.walletCash, accent: colors.indigo },
  transit: { bg: appAppearance.walletTransit, accent: colors.blue },
  loop: { bg: appAppearance.walletLoop, accent: colors.mint },
  badge: { bg: appAppearance.walletBadge, accent: colors.grey3Dark },
  key: { bg: appAppearance.walletKey, accent: colors.green },
  event: { bg: appAppearance.walletPass, accent: colors.pink },
  ticket: { bg: appAppearance.walletTicket, accent: colors.purple },
  plain: { bg: appAppearance.walletPlain, accent: colors.grey3Dark }
}

/** The tinted circle a pass or a group wears at the leading edge of a row. */
export function Dot({ sym, tint, size = 30 }: { sym: SymProps['name']; tint: string; size?: number }) {
  return (
    <span {...stylex.props(styles.dot(tint, size))}>
      <Sym name={sym} size={size * 0.53} />
    </span>
  )
}

/** The gradient card plate: watermark glyph, name and number. */
export function Face({ pass, w }: { pass: Pass; w: number }) {
  const ink = pass.ink === 'dark' ? styles.faceInkDark : styles.faceInk
  return (
    <div {...stylex.props(styles.face(FACES[pass.face].bg, w), ink)}>
      <span {...stylex.props(styles.faceMark)}>
        <Sym name={pass.icon as SymProps['name']} size={18} />
      </span>
      <span {...stylex.props(styles.faceBig)}>
        <Sym name={pass.icon as SymProps['name']} size={110} />
      </span>
      <span {...stylex.props(styles.faceName)}>{pass.name}</span>
      <span {...stylex.props(styles.faceNum)}>{pass.last4 ? `··· ${pass.last4}` : pass.detail}</span>
    </div>
  )
}

/** The round search field, shared by the sidebar and the cover's browse page. */
export function Find({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <div {...stylex.props(styles.sideFind)}>
      <Sym name="search" size={14} />
      <input
        type="search"
        value={query}
        placeholder="Search"
        aria-label="Search Wallet"
        onChange={(e) => onQuery(e.target.value)}
        {...stylex.props(styles.sideField)}
      />
    </div>
  )
}

const KINDS: { group: PassGroup; label: string; sym: SymProps['name'] }[] = [
  { group: 'cards', label: 'Card', sym: 'building' },
  { group: 'transit', label: 'Transit', sym: 'tram' },
  { group: 'passes', label: 'Pass', sym: 'star' }
]

/** The new-pass sheet: a name field over the kind picker. */
export function AddPassSheet() {
  const add = useAdd()
  const [name, setName] = useState('')
  const open = add != null
  const group = add?.group ?? 'cards'
  const save = () => {
    if (!open) return
    const id = addPass(name, group)
    setName('')
    closeAdd()
    goToPath(['browse', `p:${id}`])
  }
  return (
    <Sheet open={open} onClose={closeAdd} aria-label="New Pass">
      <div {...stylex.props(styles.sheetPad)}>
        <div {...stylex.props(styles.sheetTitle)}>
          <span {...stylex.props(typography.title3)}>New Pass</span>
        </div>
        <TextField
          autoFocus
          value={name}
          placeholder="Name"
          aria-label="Pass name"
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <div>
          <div {...stylex.props(styles.sheetTitle)}>
            <span {...stylex.props(typography.footnote)}>Kind</span>
          </div>
          <div {...stylex.props(shared.grp)}>
            {KINDS.map((k) => (
              <Row
                key={k.group}
                as="button"
                onClick={() => setAddGroup(k.group)}
                icon={<Dot sym={k.sym} tint={k.group === group ? colors.blue : colors.grey3} size={24} />}
                label={k.label}
                detail={k.group === group ? <Sym name="tick" size={15} /> : undefined}
                xstyle={styles.linkRow}
              />
            ))}
          </div>
        </div>
        <div {...stylex.props(styles.sheetBtns)}>
          <Button variant="plain" onClick={closeAdd}>
            Cancel
          </Button>
          <Button variant="filled" onClick={save}>
            Add
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

/**
 * The double-click pay sheet: the armed card rises over a dimmed stack; a tap
 * runs the charge, writes its pending row to the ledger, and the done tick
 * springs in. Only the live display schedules the close.
 */
export function PaySheet({ mirror }: { mirror?: boolean }) {
  const pay = usePay()
  const book = useBook()
  const pass = pay ? book.passes.find((p) => p.id === pay.id) : undefined
  useEffect(() => {
    if (mirror || pay?.phase !== 'done') return
    const t = setTimeout(closePay, 900)
    return () => clearTimeout(t)
  }, [mirror, pay?.phase])
  if (!pay || !pass) return null
  const tap = () => {
    if (pay.phase !== 'armed') return
    charge(pass.id)
    confirmPay()
  }
  return (
    <button
      type="button"
      onClick={tap}
      aria-label={pay.phase === 'armed' ? 'Hold near reader to pay' : 'Paid'}
      {...stylex.props(styles.pay)}
    >
      <span {...stylex.props(styles.payCard)}>
        <Face pass={pass} w={250} />
      </span>
      {pay.phase === 'armed' ? (
        <>
          <span {...stylex.props(typography.headline, styles.payHint)}>Double-Click to Pay</span>
          <span {...stylex.props(typography.footnote, styles.paySub)}>Hold Near Reader</span>
        </>
      ) : (
        <>
          <span {...stylex.props(styles.payDone)}>
            <Sym name="tick" size={26} />
          </span>
          <span {...stylex.props(typography.headline, styles.payHint)}>Done</span>
        </>
      )}
    </button>
  )
}
