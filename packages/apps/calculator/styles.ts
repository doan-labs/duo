import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  calc: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4,72px)',
    justifyContent: 'center',
    gap: 9,
    paddingInline: 14,
    paddingBottom: 12
  },
  key: {
    aspectRatio: 1,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.calculatorBackgroundColor,
    fontSize: appAppearance.calculatorFontSize,
    color: colors.white,
    transitionProperty: 'transform, filter',
    transitionDuration: '.1s',
    transform: { default: null, ':active': 'scale(.93)' },
    filter: { default: null, ':active': 'brightness(1.5)' }
  },
  g: { backgroundColor: appAppearance.calculatorBackgroundColor2, color: colors.black },
  o: { backgroundColor: colors.orange },
  z: {
    gridColumn: 'span 2',
    aspectRatio: 'auto',
    borderRadius: appAppearance.calculatorBorderRadius,
    textAlign: 'left',
    paddingLeft: 28
  },
  out: {
    gridColumn: 'span 4',
    textAlign: 'right',
    fontSize: appAppearance.calculatorFontSize2,
    fontWeight: appAppearance.homeFontWeight,
    paddingInline: 10,
    paddingBottom: 4,
    minHeight: 70,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  }
})
