import * as stylex from '@stylexjs/stylex'
import { Nav, Page, useNav } from '../uikit/nav.tsx'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'

/** name, emoji, children — a leaf is a file, anything with children is a folder. */
type Node_ = { n: string; i: string; kids?: Node_[]; size?: string }
const FILES: Node_[] = [
  {
    n: 'iCloud Drive',
    i: '☁️',
    kids: [
      {
        n: 'Freeform',
        i: '📁',
        kids: [
          { n: 'Hinge sketch', i: '🖼', size: '1.2 MB' },
          { n: 'Rail chamfer', i: '🖼', size: '840 KB' }
        ]
      },
      { n: 'Keynote', i: '📁', kids: [{ n: 'Duo launch.key', i: '📊', size: '48.3 MB' }] },
      {
        n: 'Screens',
        i: '📁',
        kids: [
          { n: 'inner@2x.png', i: '🖼', size: '2.1 MB' },
          { n: 'outer@2x.png', i: '🖼', size: '1.4 MB' }
        ]
      },
      { n: 'Specs.pdf', i: '📕', size: '312 KB' }
    ]
  },
  {
    n: 'On My iPhone',
    i: '📱',
    kids: [
      { n: 'Voice Memos', i: '📁', kids: [{ n: 'Recording 1.m4a', i: '🎙', size: '2.8 MB' }] },
      { n: 'Downloads', i: '📁', kids: [{ n: 'iPhone_Duo.usdz', i: '🧊', size: '8.1 MB' }] }
    ]
  },
  { n: 'Recently Deleted', i: '🗑', kids: [] }
]

/** A folder as an icon grid, or a file as its emoji and size. */
const Node = ({ node, back }: { node: Node_; back: () => void }) => {
  const { push } = useNav()
  const kids = node.kids ?? []
  return (
    <Page title={node.n} back={back}>
      {kids.length ? (
        <div {...stylex.props(styles.dz)}>
          {kids.map((k) => (
            <div key={k.n} {...stylex.props(styles.f)} onClick={() => push((b) => <Node node={k} back={b} />)}>
              <i {...stylex.props(styles.fIcon)}>{k.i}</i>
              <span>{k.n}</span>
              {k.size && <span {...stylex.props(shared.sub, styles.size)}>{k.size}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div {...stylex.props(shared.ph)}>
          {node.size ? <div {...stylex.props(styles.bigIcon)}>{node.i}</div> : ''}
          {node.size ?? 'Empty'}
        </div>
      )}
      {kids.length ? (
        <div {...stylex.props(shared.sub, styles.count)}>{`${kids.length} item${kids.length > 1 ? 's' : ''}`}</div>
      ) : null}
    </Page>
  )
}

const Browse = () => {
  const { push } = useNav()
  return (
    <Page title="Browse">
      <div {...stylex.props(styles.sec)}>LOCATIONS</div>
      {FILES.map((f) => (
        <div key={f.n} {...stylex.props(shared.row)} onClick={() => push((b) => <Node node={f} back={b} />)}>
          <span {...stylex.props(styles.locIcon)}>{f.i}</span>
          {f.n}
          <span {...stylex.props(shared.rowR)}>›</span>
        </div>
      ))}
    </Page>
  )
}

export const Files = () => (
  <Nav>
    <Browse />
  </Nav>
)

const styles = stylex.create({
  sec: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingInline: 16,
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.7,
    backgroundColor: colors.fillThin,
    color: colors.grey2,
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  locIcon: { fontSize: 20 },
  dz: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))',
    rowGap: 16,
    columnGap: 10,
    paddingTop: 10,
    paddingInline: 16,
    paddingBottom: 24
  },
  f: {
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
    fontSize: 11,
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.92)' }
  },
  fIcon: { fontSize: 44, lineHeight: 1 },
  size: { fontSize: 10 },
  bigIcon: { fontSize: 64 },
  count: { textAlign: 'center', paddingBlock: 6, paddingInline: 6 }
})
