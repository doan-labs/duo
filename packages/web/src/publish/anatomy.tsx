// The folder step on /publish: the submission's files as a tree you click through,
// each one saying what it is for and who checks it, the gate or a reviewer.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { CURVE } from '../motion'
import { color, ease, font, radius } from '../tokens.stylex'

const SMALL = '@media (max-width: 734px)'

type File = {
  path: string
  depth?: number
  required: 'Required' | 'When needed'
  what: string
  checked: string
}

const FILES: File[] = [
  {
    path: 'manifest.json',
    required: 'Required',
    what: 'Who the app is: the reverse-DNS id, name, version, author, the "community" lane, empty permissions and every network origin it talks to.',
    checked: 'The gate validates every field, refuses reserved namespaces and makes sure the version goes up.'
  },
  {
    path: 'main.tsx',
    required: 'Required',
    what: 'The entry point, plus any source it imports. Only @doan-labs/duo-sdk and @doan-labs/duo-uikit exports: no shell imports, nothing from another app.',
    checked:
      'duo check enforces the import boundary, strict TypeScript and the kit’s tokens, then the real builder makes the release.'
  },
  {
    path: 'package.json',
    required: 'Required',
    what: 'Declared dependencies. The platform set (sdk, kit, stylex, react, react-dom) is free; anything beyond it needs a bun.lock next to it.',
    checked: 'The gate flags extra dependencies, and a maintainer decides whether each one is worth it.'
  },
  {
    path: 'bun.lock',
    required: 'When needed',
    what: 'Only when package.json reaches past the platform set, so the build is reproducible.',
    checked: 'The gate fails a submission with extra dependencies and no lockfile.'
  },
  {
    path: 'icon.png',
    required: 'Required',
    what: 'A 1024 px square PNG. The Store, the home screen and /apps all draw it.',
    checked: 'Presence is checked; how it looks is review.'
  },
  {
    path: 'screenshots/',
    required: 'Required',
    what: 'A folder holding the two captures below.',
    checked: 'Both files must be real PNGs.'
  },
  {
    path: 'inner.png',
    depth: 1,
    required: 'Required',
    what: 'The app on the inner display, the wide one.',
    checked: 'Reviewers compare it with the running build.'
  },
  {
    path: 'cover.png',
    depth: 1,
    required: 'Required',
    what: 'The app on the cover. Cover support is a requirement, not a placeholder screen.',
    checked: 'Reviewers fold the phone with the app open and check it here.'
  },
  {
    path: 'README.md',
    required: 'Required',
    what: 'What the app does and how it behaves across the fold.',
    checked: 'Read in review.'
  },
  {
    path: 'CHANGELOG.md',
    required: 'Required',
    what: 'One entry per version, newest first. /apps shows it as the version history.',
    checked: 'The gate needs an entry for the manifest’s version.'
  },
  {
    path: 'LICENSE',
    required: 'Required',
    what: 'The MIT licence text. Every app in the catalog is open source.',
    checked: 'The gate matches the MIT text.'
  }
]

export function Anatomy() {
  const still = useReducedMotion()
  const [picked, setPicked] = useState(0)
  const file = FILES[picked]!
  return (
    <div {...stylex.props(styles.box)}>
      <div {...stylex.props(styles.tree)}>
        <p {...stylex.props(styles.root)}>community-apps/&lt;app-slug&gt;/</p>
        <ul {...stylex.props(styles.list)}>
          {FILES.map((f, i) => (
            <li key={f.path}>
              <button
                type="button"
                aria-pressed={i === picked}
                onClick={() => setPicked(i)}
                onMouseEnter={() => setPicked(i)}
                {...stylex.props(styles.file, f.depth === 1 && styles.nested, i === picked && styles.fileOn)}
              >
                {i === picked && (
                  <motion.span
                    layoutId="publish-anatomy"
                    transition={still ? { duration: 0 } : { duration: 0.28, ease: CURVE }}
                    {...stylex.props(styles.highlight)}
                  />
                )}
                <FileIcon path={f.path} />
                <span {...stylex.props(styles.fileName)}>{f.path}</span>
                {f.required !== 'Required' && <span {...stylex.props(styles.optional)}>opt</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div {...stylex.props(styles.detail)} aria-live="polite">
        <motion.div
          key={file.path}
          initial={{ opacity: 0, transform: 'translateY(6px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={still ? { duration: 0 } : { duration: 0.3, ease: CURVE }}
        >
          <p {...stylex.props(styles.detailName)}>{file.path}</p>
          <span {...stylex.props(styles.badge, file.required === 'Required' ? styles.badgeOn : styles.badgeOff)}>
            {file.required}
          </span>
          <p {...stylex.props(styles.what)}>{file.what}</p>
          <p {...stylex.props(styles.checkedK)}>Checked by</p>
          <p {...stylex.props(styles.checked)}>{file.checked}</p>
        </motion.div>
      </div>
    </div>
  )
}

/** 14 px line glyphs by kind, each with its own tint so the tree scans by type. */
const KINDS = {
  folder: { d: 'M2 4.5a1 1 0 0 1 1-1h3.2l1.3 1.5H13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z', tint: 'blue' },
  json: {
    d: 'M6 2.5c-1.5 0-2 .6-2 1.8v1.6c0 .9-.5 1.6-1.5 2.1 1 .5 1.5 1.2 1.5 2.1v1.6c0 1.2.5 1.8 2 1.8M10 2.5c1.5 0 2 .6 2 1.8v1.6c0 .9.5 1.6 1.5 2.1-1 .5-1.5 1.2-1.5 2.1v1.6c0 1.2-.5 1.8-2 1.8',
    tint: 'orange'
  },
  code: { d: 'M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5', tint: 'accent' },
  lock: { d: 'M4 7.2h8V13H4zM5.7 7.2V5.4a2.3 2.3 0 0 1 4.6 0v1.8', tint: 'gray' },
  image: {
    d: 'M2.5 3.5h11v9h-11zM2.5 11l3.2-3.2 2.3 2.3 2-2 3.5 3.4M10.3 6.3a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z',
    tint: 'green'
  },
  doc: { d: 'M4 2h5.5L12 4.5V14H4zM9.5 2v2.5H12M6 8h4M6 10.5h4', tint: 'gray' },
  license: { d: 'M8 2.5v11M4.5 13.5h7M3 5h10M3 5 1.5 9h3zM13 5l-1.5 4h3', tint: 'gray' }
} as const

const kindOf = (path: string): keyof typeof KINDS =>
  path.endsWith('/')
    ? 'folder'
    : path.endsWith('.json')
      ? 'json'
      : path.endsWith('.tsx')
        ? 'code'
        : path.endsWith('.lock')
          ? 'lock'
          : path.endsWith('.png')
            ? 'image'
            : path === 'LICENSE'
              ? 'license'
              : 'doc'

function FileIcon({ path }: { path: string }) {
  const kind = KINDS[kindOf(path)]
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...stylex.props(styles.fileIcon, tints[kind.tint])}
    >
      <path
        d={kind.d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const tints = stylex.create({
  blue: { color: color.synTag },
  orange: { color: color.orange },
  accent: { color: color.accent },
  green: { color: color.green },
  gray: { color: color.text3 }
})

const styles = stylex.create({
  box: {
    marginTop: '8px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(200px, 0.9fr) 1.4fr', [SMALL]: '1fr' },
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: 'hidden'
  },
  tree: {
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '12px',
    paddingRight: '12px',
    backgroundColor: color.well
  },
  root: {
    marginTop: 0,
    marginBottom: '8px',
    paddingLeft: '10px',
    fontFamily: font.mono,
    fontSize: '12px',
    color: color.text3,
    overflowWrap: 'anywhere'
  },
  list: { listStyleType: 'none', margin: 0, padding: 0 },
  file: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '30px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: { default: color.text2, ':hover': color.text },
    fontFamily: font.mono,
    fontSize: '13px',
    textAlign: 'start',
    cursor: 'pointer',
    transitionProperty: 'color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '-2px'
  },
  nested: { paddingLeft: '28px' },
  fileOn: { color: color.text },
  highlight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.sm,
    backgroundColor: color.thumb,
    boxShadow: color.thumbShadow
  },
  fileName: { position: 'relative', flexGrow: 1 },
  fileIcon: { position: 'relative', flexShrink: 0 },
  optional: {
    position: 'relative',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  detail: {
    paddingTop: '24px',
    paddingBottom: '24px',
    paddingLeft: { default: '26px', [SMALL]: '18px' },
    paddingRight: { default: '26px', [SMALL]: '18px' },
    minHeight: '260px'
  },
  detailName: {
    marginTop: 0,
    marginBottom: '8px',
    fontFamily: font.mono,
    fontSize: '18px',
    fontWeight: 600,
    color: color.text
  },
  badge: {
    display: 'inline-block',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radius.pill,
    fontFamily: font.sans,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  badgeOn: { backgroundColor: color.accentSoft, color: color.accent },
  badgeOff: { backgroundColor: color.grayBg, color: color.text2 },
  what: {
    marginTop: '14px',
    marginBottom: 0,
    fontFamily: font.sans,
    fontSize: '16px',
    lineHeight: 1.6,
    color: color.text
  },
  checkedK: {
    marginTop: '18px',
    marginBottom: '4px',
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  checked: { margin: 0, fontFamily: font.sans, fontSize: '14px', lineHeight: 1.55, color: color.text2 }
})
