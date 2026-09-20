// First viewport: the name, one headline, two buttons, and the real device
// filling the rest at every width, phone included. The caption waits for the
// shell to report a picture, so it never labels an empty stage.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useState } from 'react'
import { Button } from '../layout'
import { CURVE } from '../motion'
import { Simulator } from '../simulator'
import { color, font } from '../tokens.stylex'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

// Reduced motion cuts the duration, never the `initial` pose. `useReducedMotion()`
// is null on the server and a boolean on the client, so gating `initial` on it
// renders opacity 0 into the HTML and opacity 1 into the hydration, which fails the
// whole tree for exactly the readers least able to absorb a re-render.
const NONE = { duration: 0 }

export function Hero() {
  const still = useReducedMotion() ?? false
  const [painted, setPainted] = useState(false)
  // Stable, so the simulator's effect fires on the handover and not on every render.
  const paint = useCallback(() => setPainted(true), [])
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: still ? NONE : { duration: 0.8, delay: 0.08 + i * 0.09, ease: CURVE }
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
            <a
              href="https://www.producthunt.com/products/duo-9?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-duo-536"
              target="_blank"
              rel="noopener noreferrer"
              {...stylex.props(styles.hunt)}
            >
              <img
                alt="Duo - An iPhone Duo simulator you can build apps for | Product Hunt"
                width="250"
                height="54"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1254308&theme=light&t=1789724483407"
                {...stylex.props(styles.huntImg)}
              />
            </a>
          </motion.div>
        </div>
        <motion.div
          {...stylex.props(styles.stage)}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={still ? NONE : { duration: 1.2, delay: 0.5, ease: CURVE }}
        >
          <Simulator deg={180} eager tall spin onPainted={paint} />
          <motion.p
            {...stylex.props(styles.hint)}
            initial={{ opacity: 0 }}
            animate={{ opacity: painted ? 1 : 0 }}
            transition={still ? NONE : { duration: 0.6, ease: CURVE }}
          >
            Drag to turn. Use the slider to fold. Tap an icon to open an app.
          </motion.p>
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
    fontFamily: font.sans,
    overflow: 'hidden'
  },
  inner: { maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' },
  copy: { position: 'relative', zIndex: 1, maxWidth: '1100px' },
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
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '36px' },
  // Product Hunt draws the badge 54 px tall; shrunk a little to sit level with the buttons.
  hunt: { display: 'block', marginLeft: { default: 'auto', [SMALL]: 0 } },
  huntImg: { display: 'block', height: '48px', width: 'auto' },
  // The shell's camera leaves headroom above the phone; pull the frame up under the
  // buttons and let the section clip it. The frame can take the full width on a phone
  // because the shell asks the canvas for `touch-action: pan-y` (packages/shell/main.ts),
  // so a vertical drag on the device scrolls the page instead of being eaten by the orbit.
  stage: { marginTop: { default: '-40px', [SMALL]: '16px' } },
  hint: {
    marginTop: { default: '16px', [SMALL]: '12px' },
    marginBottom: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.02em',
    color: color.text3,
    textAlign: 'center',
    textWrap: 'balance'
  }
})
