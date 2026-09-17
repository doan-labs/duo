// Mail. A fixed inbox; each message opens on a pushed page.
import * as stylex from '@stylexjs/stylex'
import { Nav, Page, useNav } from '../../uikit/nav.tsx'
import { shared } from '../../uikit/styles.ts'
import { Sym } from '../../uikit/sym.tsx'
import { art, beep } from '../shared.ts'
import { styles } from './styles.ts'

type Message = [who: string, subject: string, body: string, when: string]

const MAIL: Message[] = [
  [
    'Jony',
    'Re: chamfer width',
    'Down to 0.55 mm. The hairline reads properly now — the rail stays near-black and only the bevel picks up the strip light.',
    '9:12'
  ],
  [
    'Blender Foundation',
    'Cycles 5.2 is out',
    'AgX is the default view transform. Your compositor group will need the socket-driven Glare node; the old properties are gone.',
    '8:40'
  ],
  [
    'App Store Connect',
    'Your submission is in review',
    'iPhone Duo 1.0 (build 41) has entered review. We will let you know when there is an update.',
    'Yesterday'
  ],
  [
    'Ada Lovelace',
    'On the Analytical Engine',
    'The Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves. Notes appended.',
    'Yesterday'
  ],
  [
    'Kim Minh',
    'renders',
    'gửi anh 4 tấm final nhé, hero với back đẹp nhất. macro hơi noisy, để em tăng sample.',
    'Mon'
  ],
  [
    'TestFlight',
    'iPhone Duo — build 40 expired',
    'This build is no longer available for testing. Install the latest build to keep testing.',
    'Mon'
  ]
]

/** Hand-rolled rather than `Page`: the back button carries the "Inbox" label and the header is a size smaller. */
const Read = ({ m: [who, subj, body, when], back }: { m: Message; back: () => void }) => (
  <div {...stylex.props(shared.column)}>
    <div {...stylex.props(shared.hdr, styles.hdrMd)}>
      <button type="button" {...stylex.props(shared.bk)} onClick={back}>
        <Sym name="back" size={20} />
        Inbox
      </button>
      <span {...stylex.props(shared.hdrSm, styles.actions)}>
        <Sym name="share" size={19} />
        <Sym name="more" size={19} />
      </span>
    </div>
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.subject)}>{subj}</div>
        <div {...stylex.props(styles.from)}>
          <div {...stylex.props(styles.avatar, styles.tint(art(who)))}>{who[0]}</div>
          <div>
            <div {...stylex.props(styles.name)}>{who}</div>
            <div {...stylex.props(shared.sub)}>to me</div>
          </div>
          <span {...stylex.props(shared.sub, styles.when)}>{when}</span>
        </div>
      </div>
      <div {...stylex.props(styles.artTxt)}>
        <p {...stylex.props(styles.para)}>{body}</p>
        <p {...stylex.props(styles.para)}>Sent from my iPhone Duo — both panels, one wallpaper.</p>
      </div>
    </div>
  </div>
)

const Inbox = () => {
  const { push } = useNav()
  return (
    <div>
      {MAIL.map((m, i) => {
        const [who, subj, body, when] = m
        return (
          <div key={who + subj} {...stylex.props(styles.li)} onClick={() => push((back) => <Read m={m} back={back} />)}>
            {i < 2 ? <div {...stylex.props(styles.dot)} /> : <div {...stylex.props(styles.gutter)} />}
            <div {...stylex.props(styles.tx)}>
              <b {...stylex.props(styles.who)}>{who}</b>
              <div {...stylex.props(styles.subj)}>{subj}</div>
              <p {...stylex.props(styles.preview)}>{body}</p>
            </div>
            <span {...stylex.props(shared.sub, styles.noShrink)}>{when} ›</span>
          </div>
        )
      })}
    </div>
  )
}

export const Mail = () => (
  <div {...stylex.props(shared.column, styles.rel)}>
    <Nav>
      <Page
        title={
          <>
            Inbox
            <span {...stylex.props(shared.hdrSm)}>{MAIL.length} messages</span>
          </>
        }
      >
        <Inbox />
      </Page>
    </Nav>
    <button type="button" {...stylex.props(shared.fab)} onClick={() => beep([880, 1200], 0.07, 0.05)}>
      <Sym name="plus" size={22} />
    </button>
  </div>
)
