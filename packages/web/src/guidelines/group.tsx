// The label over a block of tokens: a short bold heading with one grey line of
// guidance beside it, the way Apple's reference pages title a set of swatches.
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { color, font } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export function Group({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section {...stylex.props(styles.group)}>
      <h3 {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.title)}>{title}</span>
        <span {...stylex.props(styles.note)}>{note}</span>
      </h3>
      {children}
    </section>
  )
}

const styles = stylex.create({
  group: { marginBottom: '44px' },
  head: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: { default: '14px', [SMALL]: '4px' },
    margin: 0,
    marginBottom: '18px'
  },
  title: {
    fontFamily: font.sans,
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: color.text
  },
  note: {
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
    color: color.text3
  }
})
