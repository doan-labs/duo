// A book cover: the title's generated gradient, an inner frame hairline, spine
// shading on the left, and the title and author set in serif - the way a real
// cover carries its text, not an icon tile.

import { art } from '@doan-labs/duo-fixtures'
import * as stylex from '@stylexjs/stylex'
import type { Book } from './data.ts'
import { styles } from './styles.ts'

export type CoverSize = 's' | 'm' | 'l' | 'xl'

const SIZE: Record<CoverSize, number> = { s: 52, m: 84, l: 118, xl: 156 }

export function Cover({ b, size = 'm' }: { b: Book; size?: CoverSize }) {
  const text = { s: styles.covTexts, m: styles.covTextm, l: styles.covTextl, xl: styles.covTextxl }[size]
  const title = { s: styles.covTitles, m: styles.covTitlem, l: styles.covTitlel, xl: styles.covTitlexl }[size]
  const author = size === 'xl' ? styles.covAuthorxl : null
  return (
    <div {...stylex.props(styles.cov, styles.covW(SIZE[size]), styles.bg(art(b.title, 46)))}>
      <div {...stylex.props(styles.covFrame)} />
      <div {...stylex.props(styles.covText, text)}>
        <div {...stylex.props(styles.covTitle, title)}>{b.title}</div>
        <div {...stylex.props(styles.covAuthor, author)}>{b.author}</div>
      </div>
    </div>
  )
}
