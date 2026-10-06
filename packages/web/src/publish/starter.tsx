// The naming step on /publish: an app name and a GitHub login in, the folder, the id,
// manifest.json and the registry entry out, written the way the submission gate reads
// them. Nothing is sent anywhere; the only request is the avatar preview from GitHub.
import * as stylex from '@stylexjs/stylex'
import { useDeferredValue, useState } from 'react'
import { Pre } from '../page-parts'
import { Segmented } from '../segmented'
import { color, ease, font, radius } from '../tokens.stylex'

const SMALL = '@media (max-width: 734px)'
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

type View = 'manifest' | 'registry' | 'folder'

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function Starter() {
  const [name, setName] = useState('Pocket Garden')
  const [login, setLogin] = useState('')
  const [view, setView] = useState<View>('manifest')
  const valid = LOGIN.test(login)
  const handle = valid ? login.toLowerCase() : 'your-login'
  const slug = slugOf(name) || 'my-app'
  const id = `com.${handle.replace(/-/g, '')}.duo.${slug.replace(/-/g, '')}`
  // The avatar follows the field, but a keystroke-by-keystroke request storm is not worth it.
  const avatar = useDeferredValue(valid ? login : '')

  const manifest = JSON.stringify(
    {
      id,
      name: name.trim() || 'My App',
      version: '1.0.0',
      lane: 'community',
      entry: './main.tsx',
      icon: './icon.png',
      author: handle,
      repo: `https://github.com/doan-labs/duo/tree/main/community-apps/${slug}`,
      license: 'MIT',
      permissions: []
    },
    null,
    2
  )
  const registry = `"developers": {
  "${handle}": {
    "name": "${valid ? login : 'Your Name'}",
    "description": "One or two lines about you, up to 160 characters.",
    "imageUrl": "https://avatars.githubusercontent.com/${handle}",
    "github": "${handle}"
  }
},
"apps": {
  "${id}": {
    "folder": "${slug}",
    "developer": "${handle}",
    "maintainers": ["${handle}"]
  }
}`
  const folder = `community-apps/${slug}/
├── manifest.json
├── main.tsx
├── package.json
├── icon.png
├── screenshots/
│   ├── inner.png
│   └── cover.png
├── README.md
├── CHANGELOG.md
└── LICENSE`

  return (
    <div {...stylex.props(styles.box)}>
      <div {...stylex.props(styles.fields)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>App name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            spellCheck={false}
            {...stylex.props(styles.input)}
          />
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Your GitHub login</span>
          <span {...stylex.props(styles.withAvatar)}>
            {avatar ? (
              <img
                key={avatar}
                src={`https://avatars.githubusercontent.com/${avatar}?size=64`}
                alt=""
                width={64}
                height={64}
                {...stylex.props(styles.avatar)}
              />
            ) : (
              <span {...stylex.props(styles.avatar, styles.avatarEmpty)} />
            )}
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value.trim())}
              placeholder="octocat"
              maxLength={39}
              spellCheck={false}
              autoCapitalize="off"
              {...stylex.props(styles.input, styles.inputAvatar)}
            />
          </span>
        </label>
      </div>
      <dl {...stylex.props(styles.derived)}>
        <div {...stylex.props(styles.fact)}>
          <dt {...stylex.props(styles.factK)}>Folder</dt>
          <dd {...stylex.props(styles.factV)}>community-apps/{slug}</dd>
        </div>
        <div {...stylex.props(styles.fact)}>
          <dt {...stylex.props(styles.factK)}>App id</dt>
          <dd {...stylex.props(styles.factV)}>{id}</dd>
        </div>
        <div {...stylex.props(styles.fact)}>
          <dt {...stylex.props(styles.factK)}>Developer</dt>
          <dd {...stylex.props(styles.factV)}>{handle}</dd>
        </div>
      </dl>
      <div {...stylex.props(styles.tabs)}>
        <Segmented
          id="publish-starter"
          label="Generated file"
          semantics="tablist"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'manifest' as const, label: 'manifest.json' },
            { value: 'registry' as const, label: 'registry.json' },
            { value: 'folder' as const, label: 'Folder' }
          ]}
        />
      </div>
      <div role="tabpanel" aria-labelledby={`publish-starter-${view}`}>
        {view === 'manifest' && <Pre title={`community-apps/${slug}/manifest.json`}>{manifest}</Pre>}
        {view === 'registry' && <Pre title="community-apps/registry.json (add to both tables)">{registry}</Pre>}
        {view === 'folder' && <Pre lang="sh">{folder}</Pre>}
      </div>
      <p {...stylex.props(styles.hint)}>
        {view === 'manifest'
          ? 'The id is the app’s identity forever: the catalog, installs and saved data all key on it. Pick the name you mean to keep.'
          : view === 'registry'
            ? 'Already listed as a developer? Add only the app entry. The profile is what /apps shows on your tab.'
            : 'The folder name is only a label for people. Copy the shape from community-apps/fold-compass.'}
      </p>
    </div>
  )
}

const styles = stylex.create({
  box: {
    marginTop: '8px',
    marginBottom: '20px',
    paddingTop: '22px',
    paddingBottom: '20px',
    paddingLeft: { default: '22px', [SMALL]: '16px' },
    paddingRight: { default: '22px', [SMALL]: '16px' },
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface
  },
  fields: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr 1fr', [SMALL]: '1fr' },
    gap: '14px'
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  label: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  input: {
    width: '100%',
    height: '40px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: 'transparent', ':focus': color.borderStrong },
    backgroundColor: color.well,
    color: color.text,
    fontFamily: font.sans,
    fontSize: '15px',
    outlineStyle: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    '::placeholder': { color: color.text3 }
  },
  withAvatar: { position: 'relative', display: 'block' },
  inputAvatar: { paddingLeft: '44px' },
  avatar: {
    position: 'absolute',
    top: '9px',
    left: '10px',
    width: '22px',
    height: '22px',
    borderRadius: radius.pill,
    pointerEvents: 'none'
  },
  avatarEmpty: { backgroundColor: color.grayBg },
  derived: {
    marginTop: '18px',
    marginBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '16px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  fact: { display: 'flex', alignItems: 'baseline', gap: '16px', minWidth: 0 },
  factK: {
    flexShrink: 0,
    width: '88px',
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  factV: {
    marginLeft: 0,
    minWidth: 0,
    fontFamily: font.mono,
    fontSize: '13px',
    color: color.text,
    overflowWrap: 'anywhere'
  },
  tabs: { marginTop: '20px' },
  hint: {
    marginTop: '4px',
    marginBottom: 0,
    fontFamily: font.sans,
    fontSize: '14px',
    lineHeight: 1.55,
    color: color.text2
  }
})
