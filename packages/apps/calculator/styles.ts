import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  // The pad reads its height off the body, so the readout is never pushed off the top.
  body: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', containerType: 'size' },
  calc: {
    display: 'grid',
    // 72px keys when they fit, else what is left after the 70px readout, five 9px gaps and the bottom padding.
    gridTemplateColumns: 'repeat(4, min(72px, (100cqh - 127px) / 5))',
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
    height: 70,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  }
})
