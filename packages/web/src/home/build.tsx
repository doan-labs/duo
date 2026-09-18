// The developer turn: three commands, then an editor beside the device. A
// change in the editor lands on the screen and the phone folds to test it,
// on a loop, so the workflow reads without anyone typing.
import * as stylex from '@stylexjs/stylex'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Device } from '../device'
import { useNarrow } from '../media'
import { color } from '../tokens.stylex'
import { Block, Cap, Code, Columns, Headline, Lede, Reveal, Statement } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

const TERMINAL = `$ npx create-duo-app my-app
$ cd my-app
$ npm run dev

  Duo dev server on http://localhost:5173
  Open Duo → Settings → Developer → point it here`

const TINTS = ['#5a5ad6', '#d9653b', '#2e9a6b']

export function Build() {
  const still = useReducedMotion()
  const narrow = useNarrow()
  const [n, setN] = useState(0)
  const open = useMotionValue(1)

  // Every few seconds: the colour line changes, then the phone folds and opens
  // again to show the layout survive it.
  useEffect(() => {
    if (still) return
    const id = setInterval(async () => {
      setN((v) => (v + 1) % TINTS.length)
      await animate(open, 0.5, { duration: 1, delay: 0.6, ease: [0.65, 0, 0.35, 1] }).finished
      await animate(open, 1, { duration: 1, delay: 0.8, ease: [0.65, 0, 0.35, 1] }).finished
    }, 5200)
    return () => clearInterval(id)
  }, [still, open])

  return (
    <Block labelledBy="build-title">
      <Cap>05 · Build</Cap>
      <Headline id="build-title" lines={['Build software for hardware', 'that doesn’t exist yet.']} />
      <Lede>Point Duo at your local dev server. Edit your app. Save. Fold the device.</Lede>

      <div {...stylex.props(styles.terminal)}>
        <Reveal>
          <Code title="Terminal">{TERMINAL}</Code>
        </Reveal>
      </div>

      <div {...stylex.props(styles.scene)}>
        <Columns>
          <Code title="src/app.tsx · saved">
            {`export function App() {\n  const { mode } = useDisplay()\n  return (\n    <Screen\n      accent="`}
            <span {...stylex.props(styles.hot)}>{TINTS[n]}</span>
            {`"\n      columns={mode === 'closed' ? 1 : 2}\n    />\n  )\n}`}
          </Code>
          <div {...stylex.props(styles.device)}>
            <Device open={open} width={narrow ? 300 : 560} accent={TINTS[n]} />
          </div>
        </Columns>
      </div>

      <div {...stylex.props(styles.statement)}>
        <Reveal>
          <Statement lines={['Change code.', 'Fold the phone.', 'See what breaks.']} />
        </Reveal>
      </div>
    </Block>
  )
}

const styles = stylex.create({
  terminal: { marginTop: '56px', maxWidth: '640px' },
  scene: { marginTop: { default: '96px', [SMALL]: '56px' } },
  hot: {
    color: color.accent,
    backgroundColor: color.accentSoft,
    borderRadius: '4px',
    paddingLeft: '2px',
    paddingRight: '2px',
    transitionProperty: 'color',
    transitionDuration: '0.4s'
  },
  device: { display: 'flex', justifyContent: 'center', minHeight: { default: '640px', [MID]: '0' } },
  statement: { marginTop: { default: '140px', [MID]: '88px' } }
})
