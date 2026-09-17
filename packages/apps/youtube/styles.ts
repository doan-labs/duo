import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  logo: { width: 26, height: 26 },
  sm: { opacity: 1 },
  player: { aspectRatio: '16/9', flexShrink: 0, backgroundColor: '#000' },
  vid: { display: 'flex', flexDirection: 'column', gap: 8, paddingBlock: 10, paddingInline: 12, cursor: 'pointer' },
  thumb: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, display: 'block' },
  t: { fontWeight: 600, fontSize: 14 },
  c: { fontSize: 12, color: '#aaa' }
})
