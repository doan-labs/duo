// First viewport: the name, one headline, two buttons, and the real device
// filling the rest. Under 734 px the WebGL shell gives way to the rendered loop.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '../layout'
import { useNarrow } from '../media'
import { Simulator } from '../simulator'
import { color, font } from '../tokens.stylex'
import { CURVE } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

export function Hero() {
  const still = useReducedMotion()
  const narrow = useNarrow()
  const rise = (i: number) => ({
    initial: still ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: 0.1 + i * 0.08, ease: CURVE }
  })
  return (
    <section {...stylex.props(styles.hero)} aria-labelledby="hero-title">
      <div {...stylex.props(styles.inner)}>
        <div {...stylex.props(styles.copy)}>
          <motion.h1 id="hero-title" {...stylex.props(styles.title)} {...rise(1)}>
            Apple’s folding iPhone, simulated.
            <br />
            Build apps for it.
          </motion.h1>
          <motion.p {...stylex.props(styles.sub)} {...rise(2)}>
            Hold it. Fold it. Build for it.
          </motion.p>
          <motion.div {...stylex.props(styles.actions)} {...rise(3)}>
            <Button to="/simulator">Try Duo</Button>
            <Button to="/get-started" outline>
              Build an app
            </Button>
          </motion.div>
        </div>
        <motion.div
          {...stylex.props(styles.stage)}
          initial={still ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.35, ease: CURVE }}
        >
          {narrow ? (
            <video
              aria-label="Duo folding open and shut"
              autoPlay={!still}
              muted
              loop
              playsInline
              preload="metadata"
              poster="/hero-poster.jpg"
              {...stylex.props(styles.video)}
            >
              <source src="/hero.webm" type="video/webm" />
              <source src="/hero.mp4" type="video/mp4" />
            </video>
          ) : (
            <Simulator deg={180} eager tall />
          )}
          <p {...stylex.props(styles.hint)}>Drag to turn. Use the slider to fold. Tap an icon to open an app.</p>
        </motion.div>
      </div>
    </section>
  )
}

const styles = stylex.create({
  hero: {
    paddingTop: { default: '96px', [MID]: '72px', [SMALL]: '48px' },
    paddingBottom: { default: '40px', [SMALL]: '24px' },
    paddingLeft: { default: '40px', [SMALL]: '24px' },
    paddingRight: { default: '40px', [SMALL]: '24px' },
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  inner: { maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' },
  copy: { maxWidth: '1100px' },
  title: {
    marginTop: 0,
    marginBottom: 0,
    fontFamily: font.display,
    fontSize: { default: '76px', [MID]: '54px', [SMALL]: '38px' },
    lineHeight: 1.02,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    textWrap: 'balance'
  },
  sub: {
    marginTop: '24px',
    marginBottom: 0,
    fontSize: { default: '22px', [SMALL]: '18px' },
    lineHeight: 1.4,
    color: color.text2
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '36px' },
  stage: { marginTop: { default: '48px', [SMALL]: '32px' } },
  video: { display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', borderRadius: '20px' },
  hint: {
    marginTop: '16px',
    marginBottom: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.02em',
    color: color.text3,
    textAlign: 'center'
  }
})
