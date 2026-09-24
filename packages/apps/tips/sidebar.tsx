// The wide layout's sidebar: Saved on its own, then one destination per
// collection with its gradient square and tip count. Selection is a rounded
// row, the iPadOS pattern Settings uses.

import { LargeTitle } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { COLLECTIONS } from './data.ts'
import { styles } from './styles.ts'

export function Sidebar({ current, pick }: { current: string; pick: (id: string) => void }) {
  return (
    <nav aria-label="Tips" {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideScroll)}>
        <LargeTitle as="h1" xstyle={styles.sideTitle}>
          Tips
        </LargeTitle>
        <button
          type="button"
          aria-current={current === 'saved' || undefined}
          onClick={() => pick('saved')}
          {...stylex.props(styles.dest, shared.select, current === 'saved' && styles.destOn)}
        >
          <Sym name="bookmark" size={16} />
          <span {...stylex.props(typography.subheadline, styles.destName)}>Saved</span>
        </button>
        <div {...stylex.props(styles.destGap)} />
        {COLLECTIONS.map((collection) => (
          <button
            key={collection.id}
            type="button"
            aria-current={collection.id === current || undefined}
            onClick={() => pick(collection.id)}
            {...stylex.props(styles.dest, shared.select, collection.id === current && styles.destOn)}
          >
            <span {...stylex.props(styles.destArt, styles.art(collection.art))}>
              <Sym name={collection.glyph} size={14} />
            </span>
            <span {...stylex.props(typography.subheadline, styles.destName)}>{collection.title}</span>
            <span {...stylex.props(typography.subheadline, styles.destN)}>{collection.tips.length}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
