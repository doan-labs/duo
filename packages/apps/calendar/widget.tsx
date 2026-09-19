import { WidgetLabel } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'

/** The home-screen tile. Its own file so the shell can bake it without pulling in the app's storage. */
export function CalendarWidget({ onOpen }: { onOpen: (from: HTMLElement) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const today = new Date()
  return (
    <div ref={el} {...stylex.props(shared.glass, shared.widget, styles.calWidget)} onClick={() => onOpen(el.current!)}>
      <WidgetLabel xstyle={[styles.calDay]}>{today.toLocaleDateString('en', { weekday: 'long' })}</WidgetLabel>
      <div {...stylex.props(styles.calNum)}>{today.getDate()}</div>
      {/* Short enough for one line each: screen.ts bakes the same widget on canvas,
          which does not wrap, and a line that wraps here would not wrap there. */}
      <div {...stylex.props(styles.calEv)}>
        Duo keynote
        <div {...stylex.props(styles.calSub)}>10:00 Apple Park</div>
      </div>
    </div>
  )
}

const styles = stylex.create({
  calWidget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.calendarBackgroundColor,
    color: colors.black
  },
  calDay: { color: colors.red, textTransform: 'uppercase', letterSpacing: 0.4 },
  calNum: {
    fontSize: appAppearance.calendarFontSize3,
    fontWeight: appAppearance.musicFontWeight2,
    lineHeight: 1.05,
    letterSpacing: -1
  },
  calEv: {
    marginTop: 'auto',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.orange,
    paddingLeft: 7,
    fontSize: appAppearance.calendarFontSize4,
    lineHeight: 1.35,
    fontWeight: appAppearance.musicFontWeight2
  },
  calSub: { fontWeight: appAppearance.calendarFontWeight, opacity: 0.55 }
})
