// Frame shared by the four tabs: the wide-layout sidebar, the floating glass
// tab bar on the cover, and the pane header (title plus action buttons).

import { Sym } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { TABS, type Tab } from './store.ts'
import { styles } from './styles.ts'

export const Sidebar = ({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) => (
  <nav {...stylex.props(styles.side)}>
    <div {...stylex.props(styles.sideTitle)}>Clock</div>
    {TABS.map((t) => (
      <button
        key={t.id}
        type="button"
        aria-current={t.id === tab ? 'page' : undefined}
        onClick={() => setTab(t.id)}
        {...stylex.props(styles.sideItem, t.id === tab && styles.sideItemOn, shared.press)}
      >
        <span {...stylex.props(t.id === tab ? styles.sideSym : styles.cap)}>
          <Sym name={t.sym} size={17} />
        </span>
        {t.name}
      </button>
    ))}
  </nav>
)

export const TabBar = ({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) => (
  <nav {...stylex.props(styles.tabs, animations.float)} aria-label="Clock sections">
    {TABS.map((t) => (
      <button
        key={t.id}
        type="button"
        aria-current={t.id === tab ? 'page' : undefined}
        onClick={() => setTab(t.id)}
        {...stylex.props(styles.tab, t.id === tab && styles.tabOn, shared.press)}
      >
        <Sym name={t.sym} size={19} />
        {t.name}
      </button>
    ))}
  </nav>
)

/** A pane's top edge: large title left, trailing action buttons right. */
export const Head = ({ title, actions }: { title: string; actions?: ReactNode }) => (
  <div {...stylex.props(styles.head)}>
    <div {...stylex.props(styles.title)}>{title}</div>
    <div {...stylex.props(styles.actions)}>{actions}</div>
  </div>
)
