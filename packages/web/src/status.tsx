import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { color, font, radius } from './tokens.stylex'

export type Status = 'works' | 'proposed' | 'unfinished' | 'plan' | 'legacy'

const LABEL: Record<Status, string> = {
  works: 'Works today',
  proposed: 'Proposed',
  unfinished: 'Not built yet',
  plan: 'Planning document',
  legacy: 'Transitional'
}

/** The one visual rule for honesty: anything not shipped carries a badge next to its heading. */
export function Badge({ status }: { status: Status }) {
  return <span {...stylex.props(styles.badge, tone[status])}>{LABEL[status]}</span>
}

/** A boxed note under a heading: the badge says how far the thing exists, the text says what that means. */
export function Notice({ status, children }: { status: Status; children: ReactNode }) {
  return (
    <aside {...stylex.props(styles.notice)}>
      <span {...stylex.props(styles.bar, rail[status])} aria-hidden="true" />
      <div {...stylex.props(styles.body)}>
        <Badge status={status} />
        <p {...stylex.props(styles.text)}>{children}</p>
      </div>
    </aside>
  )
}

const styles = stylex.create({
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: font.mono,
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    lineHeight: 1,
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radius.pill,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap'
  },
  notice: {
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'hidden',
    marginTop: '20px',
    marginBottom: '28px',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border
  },
  bar: { flexShrink: 0, width: '3px', alignSelf: 'stretch' },
  body: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '18px', paddingRight: '18px', minWidth: 0 },
  text: { margin: 0, marginTop: '10px', fontFamily: font.sans, fontSize: '14px', lineHeight: 1.55, color: color.text2 }
})

const tone = stylex.create({
  works: { color: color.green, backgroundColor: color.greenBg },
  proposed: { color: color.orange, backgroundColor: color.orangeBg },
  unfinished: { color: color.red, backgroundColor: color.redBg },
  plan: { color: color.gray, backgroundColor: color.grayBg },
  legacy: { color: color.gray, backgroundColor: color.grayBg }
})

const rail = stylex.create({
  works: { backgroundColor: color.green },
  proposed: { backgroundColor: color.orange },
  unfinished: { backgroundColor: color.red },
  plan: { backgroundColor: color.borderStrong },
  legacy: { backgroundColor: color.borderStrong }
})
