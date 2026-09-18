import { app, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type ComponentType, useState } from 'react'
import { Line } from './highlight'
import { color, font, radius } from './tokens.stylex'

// One file per component in kit-demos/: `button.tsx` is the Button demo. The
// component renders live and the same file's text is the code shown under it,
// so the sample can never drift from what runs.
const modules = import.meta.glob<{ default: ComponentType }>('./kit-demos/*.tsx', { eager: true })
const sources = import.meta.glob<string>('./kit-demos/*.tsx', { eager: true, query: '?raw', import: 'default' })
const pascal = (file: string) =>
  file
    .replace(/^.*\/|\.tsx$/g, '')
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join('')
const demos = new Map(
  Object.entries(modules).map(([file, m]) => [
    pascal(file),
    { Demo: m.default, code: sources[file] ?? '', path: `packages/web/src/kit-demos/${file.replace(/^.*\//, '')}` }
  ])
)

export const hasDemo = (name: string) => demos.has(name)

/**
 * The real kit component, live, in the light app theme at a display width.
 * 387 is the cover display in points, 790 the inner one.
 */
export function KitFrame({ name, width = 387, height = 360 }: { name: string; width?: number; height?: number }) {
  const demo = demos.get(name)
  if (!demo) return null
  return (
    <div data-kit-frame="" {...stylex.props(styles.frame, theme, styles.size(width, height))}>
      <demo.Demo />
    </div>
  )
}

type Tab = 'preview' | 'usage'

/** The real kit component in a phone-width frame with the light app theme, and a Usage tab with the source that renders it. */
export function KitPreview({ name }: { name: string }) {
  const demo = demos.get(name)
  const [tab, setTab] = useState<Tab>('preview')
  const [open, setOpen] = useState(false)
  if (!demo) return null
  return (
    <div>
      <div role="tablist" {...stylex.props(styles.tabs)}>
        {(['preview', 'usage'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            {...stylex.props(styles.tab, tab === t && styles.tabOn)}
          >
            {t === 'preview' ? 'Preview' : 'Usage'}
          </button>
        ))}
      </div>
      {tab === 'preview' ? (
        <div {...stylex.props(styles.stage)}>
          <KitFrame name={name} />
        </div>
      ) : (
        <div {...stylex.props(styles.codeCard)}>
          <div {...stylex.props(styles.codeHead)}>
            <span {...stylex.props(styles.lang)}>TSX</span>
            <span {...stylex.props(styles.path)}>{demo.path}</span>
          </div>
          <div {...stylex.props(styles.codeWrap, !open && styles.collapsed)}>
            <pre {...stylex.props(styles.pre)}>
              <code>
                <Line code={demo.code.trimEnd()} />
              </code>
            </pre>
            {demo.code.split('\n').length > 12 && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                {...stylex.props(styles.toggle, open && styles.toggleOpen)}
              >
                {open ? 'Collapse code' : 'Expand code'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// The same light app theme the Developer gallery applies to its root.
const theme = stylex.createTheme(app, { bg: colors.groupedLight, fg: colors.black })

const styles = stylex.create({
  tabs: {
    display: 'inline-flex',
    gap: '2px',
    padding: '3px',
    marginBottom: '16px',
    borderRadius: radius.md,
    backgroundColor: color.well
  },
  tab: {
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: { default: color.text2, ':hover': color.text },
    cursor: 'pointer'
  },
  tabOn: { backgroundColor: color.surface, color: color.text, boxShadow: color.shadow },
  stage: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '32px',
    paddingBottom: '32px',
    paddingLeft: '24px',
    paddingRight: '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.well
  },
  // Cover-display width by default: the kit's layouts are proven at 387 points before anything else.
  size: (width: number, height: number) => ({ width: `${width}px`, height: `${height}px` }),
  frame: {
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: '18px',
    backgroundColor: colors.groupedLight,
    color: colors.black,
    // The shell's body font: 400 15px/1.4 on the system stack.
    fontFamily: fonts.system,
    fontSize: '15px',
    lineHeight: 1.4,
    boxShadow: color.shadow
  },
  codeCard: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.surface
  },
  codeHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    backgroundColor: color.well
  },
  lang: {
    fontFamily: font.mono,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radius.sm,
    backgroundColor: color.grayBg,
    color: color.text2
  },
  path: { fontFamily: font.mono, fontSize: '12px', color: color.text2 },
  codeWrap: { position: 'relative' },
  collapsed: { maxHeight: '300px', overflow: 'hidden' },
  pre: {
    fontFamily: font.mono,
    fontSize: '13px',
    lineHeight: 1.7,
    color: color.text,
    margin: 0,
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '18px',
    paddingRight: '18px',
    overflowX: 'auto',
    whiteSpace: 'pre'
  },
  toggle: {
    position: 'absolute',
    left: '50%',
    bottom: '16px',
    transform: 'translateX(-50%)',
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.borderStrong, ':hover': color.accent },
    backgroundColor: color.surface,
    color: color.text,
    cursor: 'pointer',
    boxShadow: color.shadow
  },
  toggleOpen: {
    position: 'static',
    display: 'block',
    transform: 'none',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: '16px'
  }
})
