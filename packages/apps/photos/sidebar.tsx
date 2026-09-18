import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { SIDEBAR } from './data.ts'
import { styles } from './styles.ts'

export const Sidebar = ({
  current,
  pick,
  close
}: {
  current: string
  pick: (id: string) => void
  close: () => void
}) => (
  <nav aria-label="Photos sidebar" {...stylex.props(styles.side)}>
    <div {...stylex.props(styles.sideTop)}>
      <button type="button" aria-label="Hide sidebar" onClick={close} {...stylex.props(styles.tool, shared.press)}>
        <Sym name="sidebar" size={16} />
      </button>
    </div>
    <div {...stylex.props(styles.sideScroll)}>
      {SIDEBAR.map((section, i) => (
        <div key={section.name ?? i}>
          {section.name && <div {...stylex.props(styles.sideSection)}>{section.name}</div>}
          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === current || undefined}
              onClick={() => pick(item.id)}
              {...stylex.props(styles.sideRow, shared.select, item.id === current && styles.sideRowOn)}
            >
              <span {...stylex.props(styles.sideSym)}>
                <Sym name={item.sym} size={15} />
              </span>
              <span {...stylex.props(styles.sideName)}>{item.name}</span>
              {item.lock && (
                <span {...stylex.props(styles.sideLock)}>
                  <Sym name="lock" size={11} />
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  </nav>
)
