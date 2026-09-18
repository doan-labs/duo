import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  blue: { color: colors.blueDark },
  white: { backgroundColor: colors.white },
  chk: {
    width: 22,
    height: 22,
    borderRadius: appAppearance.settingsBorderRadius,
    borderWidth: 1.7,
    borderStyle: 'solid',
    borderColor: colors.grey3,
    flexShrink: 0,
    position: 'relative',
    cursor: 'pointer',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '.2s',
    '::after': {
      content: '""',
      position: 'absolute',
      left: 7,
      top: 3.5,
      width: 5,
      height: 10,
      borderTopWidth: 0,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderLeftWidth: 0,
      borderStyle: 'solid',
      borderColor: colors.white,
      transform: 'rotate(45deg) scale(0)',
      transitionProperty: 'transform',
      transitionDuration: '.24s',
      transitionTimingFunction: appAppearance.remindersTransitionTimingFunction
    }
  },
  chkOn: {
    borderColor: colors.blueDark,
    backgroundColor: colors.blueDark,
    '::after': { transform: 'rotate(45deg) scale(1)' }
  },
  dim: { opacity: 0.45 },
  label: { fontSize: appAppearance.calendarFontSize, transitionProperty: 'opacity', transitionDuration: '.25s' },
  done: { opacity: 0.38, textDecorationLine: 'line-through' },
  input: {
    flexGrow: 1,
    flexBasis: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    fontSize: appAppearance.calendarFontSize
  }
})
