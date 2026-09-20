import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { COLOUR_COUNT, Colour } from '../guidelines/colour'
import { EASING_COUNT, Easing } from '../guidelines/easing'
import { GEOMETRY_COUNT, Geometry } from '../guidelines/geometry'
import { Rules } from '../guidelines/rules'
import { panelId, type Tab, Tabs, tabId } from '../guidelines/tabs'
import { TYPE_COUNT, Typography } from '../guidelines/typography'
import { Section } from '../layout'
import { CURVE } from '../motion'
import { PageTop } from '../page-parts'

export const Route = createFileRoute('/guidelines')({
  head: () => ({ meta: [{ title: 'Human Interface Guidelines · Duo' }] }),
  component: Page
})

// Every count is the number of tokens the tab draws, read off the generated
// arrays: a token added to the kit shows up here without an edit.
const TABS: Tab[] = [
  { id: 'rules', label: 'Rules' },
  { id: 'colour', label: 'Colour', count: COLOUR_COUNT },
  { id: 'typography', label: 'Typography', count: TYPE_COUNT },
  { id: 'layout', label: 'Layout', count: GEOMETRY_COUNT },
  { id: 'motion', label: 'Motion', count: EASING_COUNT }
]

function Page() {
  const still = useReducedMotion()
  const [open, setOpen] = useState('rules')

  return (
    <Section>
      <PageTop
        eyebrow="Guidelines"
        title="Human Interface Guidelines"
        lead="Short and opinionated. Three rules cover most of what makes an app feel right on a phone that folds; the rest is iOS."
      />

      <Tabs tabs={TABS} open={open} onOpen={setOpen} />

      {/* Opacity only: a layout animation here would fight the sliding underline. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={open}
          id={panelId(open)}
          role="tabpanel"
          aria-labelledby={tabId(open)}
          // Two of the five panels are pure specimens with nothing focusable in
          // them, so the panel itself is the keyboard's way in.
          tabIndex={0}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0 : 0.2, ease: CURVE }}
          {...stylex.props(styles.panel)}
        >
          {open === 'rules' && <Rules />}
          {open === 'colour' && <Colour />}
          {open === 'typography' && <Typography />}
          {open === 'layout' && <Geometry />}
          {open === 'motion' && <Easing />}
        </motion.div>
      </AnimatePresence>
    </Section>
  )
}

const styles = stylex.create({
  panel: { paddingTop: '40px' }
})
