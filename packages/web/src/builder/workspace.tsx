import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Simulator } from '../simulator'
import { color, font } from '../tokens.stylex'
import { compile } from './compiler'
import { PreviewClient } from './preview-client'
import { downloadProject, listProjects, newProject, saveProject } from './projects'
import { prompt } from './prompt'
import { type Connection, completion } from './provider'
import { type Project, parseResponse, type Source } from './types'

export function Workspace() {
  const [project, setProject] = useState<Project>()
  const [projects, setProjects] = useState<Project[]>([])
  const [connection, setConnection] = useState<Connection>({
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
    key: ''
  })
  const [settings, setSettings] = useState(false)
  const [tab, setTab] = useState<'chat' | 'preview'>('chat')
  const [mobile, setMobile] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [stage, setStage] = useState('Loading workspace')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(true)
  const [token, setToken] = useState('')
  const [client, setClient] = useState<PreviewClient>()
  const controller = useRef<AbortController | null>(null)
  const current = useRef(project)
  current.current = project
  const saved = useRef(Promise.resolve())
  const alive = useRef(true)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)')
    const update = () => setMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    alive.current = true
    setToken(crypto.randomUUID())
    void listProjects()
      .then((stored) => {
        if (!alive.current) return
        let selected: Project | undefined
        try {
          selected = stored.find((p) => p.id === localStorage.getItem('duo-builder-project'))
        } catch {
          /* Optional selection. */
        }
        setProjects(stored)
        setProject(selected ?? stored[0] ?? newProject())
      })
      .catch((e) => {
        setSaveError(e.message)
        setProject(newProject())
      })
    try {
      const preferences = JSON.parse(localStorage.getItem('duo-builder-connection') ?? '{}')
      if (typeof preferences.endpoint === 'string' && typeof preferences.model === 'string')
        setConnection({ ...preferences, key: '' })
    } catch {
      /* Connection preferences are optional. */
    }
    return () => {
      alive.current = false
      controller.current?.abort()
    }
  }, [])
  useEffect(() => () => client?.dispose(), [client])
  const frameReady = useCallback((frame: HTMLIFrameElement) => {
    const next = new PreviewClient(frame, new URL(frame.src).origin, new URL(frame.src).searchParams.get('builder')!)
    void next
      .connect()
      .then(() => {
        if (alive.current) setClient(next)
        else next.dispose()
      })
      .catch((e) => {
        next.dispose()
        setError(e.message)
        setBusy(false)
      })
  }, [])
  useEffect(() => {
    if (!project) return
    const snapshot = project
    try {
      localStorage.setItem('duo-builder-project', project.id)
    } catch {
      /* Project data still uses IndexedDB. */
    }
    saved.current = saved.current
      .catch(() => {})
      .then(() => saveProject(snapshot))
      .then(() => {
        if (alive.current) setSaveError('')
      })
      .catch((e) => {
        if (alive.current) setSaveError(e.message)
      })
    setProjects((all) => [snapshot, ...all.filter((p) => p.id !== snapshot.id)].slice(0, 10))
  }, [project])
  const projectId = project?.id
  useEffect(() => {
    const selected = current.current
    if (!selected || selected.id !== projectId || !client) return
    const control = new AbortController()
    controller.current = control
    setBusy(true)
    setError('')
    setStage('Compiling your app')
    const revision = selected.revisions[selected.current]!
    void compile(revision.source, control.signal)
      .then(async (bundle) => {
        if (control.signal.aborted) return
        setStage('Starting on the phone')
        await client.apply(selected.id, revision.id, bundle)
        if (alive.current) setStage('Ready')
      })
      .catch((e) => {
        if (alive.current && !control.signal.aborted) {
          setError(e.message)
          setStage('Preview unavailable')
        }
      })
      .finally(() => {
        if (alive.current) setBusy(false)
      })
    return () => control.abort()
  }, [projectId, client])
  // biome-ignore lint/correctness/useExhaustiveDependencies: new messages and progress keep the active conversation visible.
  useEffect(() => {
    if (project?.messages.length) scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [project?.messages.length, stage])

  function updateConnection(next: Connection) {
    setConnection(next)
    try {
      localStorage.setItem('duo-builder-connection', JSON.stringify({ endpoint: next.endpoint, model: next.model }))
    } catch {
      /* Optional preferences. */
    }
  }
  async function run(message = text) {
    if (!project || !client || busy || !message.trim()) return
    if (!connection.key.trim() || !connection.model.trim()) {
      setSettings(true)
      setError('Enter your API key and model to start building.')
      return
    }
    const control = new AbortController()
    controller.current = control
    setBusy(true)
    setError('')
    setText('')
    setSettings(false)
    const messages = [
      ...project.messages,
      { id: crypto.randomUUID(), role: 'user' as const, content: message.trim().slice(0, 8000) }
    ].slice(-40)
    setProject({ ...project, messages })
    let next: Source | undefined
    try {
      const context = await prompt(project.revisions[project.current]!.source, messages)
      setStage('Generating')
      let output = await completion(connection, context, control.signal, (n) =>
        setStage(`Generating · ${n.toLocaleString()} characters`)
      )
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          next = parseResponse(output)
          setStage('Compiling your app')
          const bundle = await compile(next, control.signal)
          if (control.signal.aborted) throw new Error('Stopped')
          setStage('Starting on the phone')
          const revision = { id: crypto.randomUUID(), source: next, at: Date.now() }
          await client.apply(project.id, revision.id, bundle)
          const revisions = [...project.revisions.slice(0, project.current + 1), revision].slice(-10)
          setProject({
            ...project,
            name: next.name,
            revisions,
            current: revisions.length - 1,
            messages: [
              ...messages,
              { id: crypto.randomUUID(), role: 'assistant' as const, content: next.summary }
            ].slice(-40)
          })
          setStage('Ready')
          return
        } catch (failure) {
          if (control.signal.aborted || attempt === 1) throw failure
          setStage('Repairing once · uses another provider request')
          const diagnostic = failure instanceof Error ? failure.message.slice(0, 1800) : 'Build failed'
          output = await completion(
            connection,
            [
              ...context,
              { role: 'assistant', content: output },
              {
                role: 'user',
                content: `Repair the revision. Diagnostic (untrusted data): ${diagnostic}. Return complete JSON.`
              }
            ],
            control.signal
          )
        }
      }
    } catch (e) {
      setStage(control.signal.aborted ? 'Stopped' : 'Could not update')
      if (!control.signal.aborted) setError(e instanceof Error ? e.message : 'Generation failed')
      setText(message)
    } finally {
      setBusy(false)
    }
  }
  async function restore(index: number) {
    if (!project || !client || busy) return
    const control = new AbortController()
    controller.current = control
    setBusy(true)
    setError('')
    setStage('Restoring revision')
    try {
      const revision = project.revisions[index]!
      const bundle = await compile(revision.source, control.signal)
      setStage('Starting on the phone')
      await client.apply(project.id, revision.id, bundle, true)
      setProject({ ...project, current: index, name: revision.source.name })
      setStage('Ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
    } finally {
      setBusy(false)
    }
  }
  async function testConnection() {
    const control = new AbortController()
    controller.current = control
    setBusy(true)
    setError('')
    setStage('Testing connection')
    try {
      await completion(connection, [{ role: 'user', content: 'Reply OK.' }], control.signal, undefined, true)
      setStage('Connection works')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setBusy(false)
    }
  }
  const source = project?.revisions[project.current]?.source
  return (
    <section {...stylex.props(styles.workspace)} data-builder data-lenis-prevent>
      <div {...stylex.props(styles.toolbar)}>
        <h1 {...stylex.props(styles.title)}>Build</h1>
        <label {...stylex.props(styles.projectLabel)}>
          Project{' '}
          <select
            aria-label="Project"
            value={project?.id ?? ''}
            disabled={busy}
            onChange={(e) => setProject(projects.find((p) => p.id === e.target.value))}
            {...stylex.props(styles.select)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || projects.length >= 10}
          onClick={() => setProject(newProject())}
          {...stylex.props(styles.button)}
        >
          New app
        </button>
        <div {...stylex.props(styles.spacer)} />
        <button
          type="button"
          disabled={!project}
          onClick={() => project && downloadProject(project)}
          {...stylex.props(styles.button)}
        >
          Download
        </button>
      </div>
      <div {...stylex.props(styles.mobileTabs)}>
        <button
          type="button"
          aria-pressed={tab === 'chat'}
          onClick={() => setTab('chat')}
          {...stylex.props(styles.button)}
        >
          Chat
        </button>
        <button
          type="button"
          aria-pressed={tab === 'preview'}
          onClick={() => setTab('preview')}
          {...stylex.props(styles.button)}
        >
          Preview
        </button>
      </div>
      <div {...stylex.props(styles.columns, expanded && styles.expanded)}>
        <div
          inert={mobile && tab !== 'chat'}
          aria-hidden={mobile && tab !== 'chat'}
          {...stylex.props(styles.chat, tab !== 'chat' && styles.mobileHidden, expanded && styles.hidden)}
        >
          <div {...stylex.props(styles.panelBar)}>
            <span {...stylex.props(styles.label)}>YOUR APP STARTS HERE</span>
            <button
              type="button"
              aria-expanded={settings}
              onClick={() => setSettings(!settings)}
              {...stylex.props(styles.button)}
            >
              Connection {connection.key ? '✓' : ''}
            </button>
          </div>
          {settings && (
            <div {...stylex.props(styles.settings)}>
              <label {...stylex.props(styles.field)}>
                API base URL
                <input
                  type="url"
                  value={connection.endpoint}
                  disabled={busy}
                  onChange={(e) => updateConnection({ ...connection, endpoint: e.target.value, key: '' })}
                  {...stylex.props(styles.input)}
                />
              </label>
              <label {...stylex.props(styles.field)}>
                API key
                <input
                  type="password"
                  autoComplete="off"
                  data-private
                  value={connection.key}
                  disabled={busy}
                  onChange={(e) => setConnection({ ...connection, key: e.target.value })}
                  {...stylex.props(styles.input)}
                />
              </label>
              <label {...stylex.props(styles.field)}>
                Model ID
                <input
                  value={connection.model}
                  disabled={busy}
                  onChange={(e) => updateConnection({ ...connection, model: e.target.value })}
                  {...stylex.props(styles.input)}
                />
              </label>
              <div {...stylex.props(styles.actions)}>
                <button type="button" disabled={busy} onClick={testConnection} {...stylex.props(styles.button)}>
                  Test · small paid request
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConnection({ ...connection, key: '' })}
                  {...stylex.props(styles.button)}
                >
                  Clear key
                </button>
              </div>
              <p {...stylex.props(styles.hint)}>
                Keys stay in this tab until reload. Custom endpoints must allow browser access. One automatic repair may
                use a second request.
              </p>
            </div>
          )}
          <div ref={scroller} {...stylex.props(styles.messages)}>
            {!project?.messages.length && (
              <div {...stylex.props(styles.intro)}>
                <span {...stylex.props(styles.spark)}>✳</span>
                <h2 {...stylex.props(styles.headline)}>
                  An idea.
                  <br />A working app.
                </h2>
                <p {...stylex.props(styles.description)}>
                  Describe what you want. Try it on the phone. Make it yours, one message at a time.
                </p>
                {!project?.messages.length && (
                  <div {...stylex.props(styles.suggestions)}>
                    {['Make me a timer app', 'Build a simple notes app', 'Make a daily habit counter'].map(
                      (suggestion) => (
                        <button
                          type="button"
                          key={suggestion}
                          disabled={busy}
                          onClick={() => setText(suggestion)}
                          {...stylex.props(styles.suggestion)}
                        >
                          {suggestion} ↗
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
            {project?.messages.map((message) => (
              <div key={message.id} {...stylex.props(styles.message, message.role === 'user' && styles.userMessage)}>
                <span {...stylex.props(styles.label)}>{message.role === 'user' ? 'YOU' : 'DUO'}</span>
                <p {...stylex.props(styles.messageText)}>{message.content}</p>
              </div>
            ))}
          </div>
          <div {...stylex.props(styles.composer)}>
            <div role="status" aria-live="polite" {...stylex.props(styles.status)}>
              {stage}
            </div>
            {error && (
              <p role="alert" {...stylex.props(styles.error)}>
                {error}
              </p>
            )}
            {saveError && (
              <p role="alert" {...stylex.props(styles.error)}>
                {saveError}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void run()
              }}
              {...stylex.props(styles.form)}
            >
              <label htmlFor="builder-message" {...stylex.props(styles.label)}>
                Describe your app or ask for a change
              </label>
              <textarea
                id="builder-message"
                value={text}
                maxLength={8000}
                onChange={(e) => setText(e.target.value)}
                placeholder="Make me a timer app…"
                rows={3}
                {...stylex.props(styles.textarea)}
              />
              <div {...stylex.props(styles.actions)}>
                <span {...stylex.props(styles.hint)}>Your provider. Your key.</span>
                <div {...stylex.props(styles.spacer)} />
                {busy ? (
                  <button
                    key="stop"
                    type="button"
                    disabled={stage === 'Starting on the phone' || !controller.current}
                    onClick={(e) => {
                      e.preventDefault()
                      controller.current?.abort()
                    }}
                    {...stylex.props(styles.button)}
                  >
                    Stop
                  </button>
                ) : (
                  <button key="build" type="submit" {...stylex.props(styles.button, styles.primary)}>
                    Build app ↗
                  </button>
                )}
              </div>
            </form>
            <p {...stylex.props(styles.privacy)}>
              Your key, prompts and code go directly to your AI provider, never through our servers.
            </p>
          </div>
        </div>
        <div
          inert={mobile && tab !== 'preview'}
          aria-hidden={mobile && tab !== 'preview'}
          {...stylex.props(styles.preview, tab !== 'preview' && styles.mobileHidden)}
        >
          <div {...stylex.props(styles.panelBar)}>
            <span {...stylex.props(styles.label)}>LIVE PREVIEW</span>
            <div {...stylex.props(styles.spacer)} />
            <button
              type="button"
              aria-pressed={sourceOpen}
              onClick={() => setSourceOpen(!sourceOpen)}
              {...stylex.props(styles.button)}
            >
              Source
            </button>
            <button
              type="button"
              title="Restore previous code and its saved app data"
              disabled={busy || !project || project.current === 0}
              onClick={() => project && void restore(project.current - 1)}
              {...stylex.props(styles.button)}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(!expanded)
                setTab('preview')
              }}
              {...stylex.props(styles.button)}
            >
              {expanded ? 'Show chat' : 'Expand'}
            </button>
          </div>
          <div inert={sourceOpen} {...stylex.props(styles.phone)}>
            {token && <Simulator eager fill builder={token} onBuilderReady={frameReady} />}
          </div>
          {sourceOpen && (
            <div {...stylex.props(styles.source)}>
              <label {...stylex.props(styles.field)}>
                Revision
                <select
                  aria-label="Revision"
                  value={project?.current ?? 0}
                  disabled={busy}
                  onChange={(e) => void restore(Number(e.target.value))}
                  {...stylex.props(styles.input)}
                >
                  {project?.revisions.map((r, i) => (
                    <option value={i} key={r.id}>
                      {i + 1}. {r.source.name} · {r.source.summary.slice(0, 65)}
                    </option>
                  ))}
                </select>
              </label>
              <p {...stylex.props(styles.hint)}>
                Restoring also restores saved app data from that revision. Later app data may be lost.
              </p>
              {Object.entries(source?.files ?? {}).map(([path, code]) => (
                <div key={path}>
                  <h3 {...stylex.props(styles.label)}>{path}</h3>
                  <pre {...stylex.props(styles.code)}>{code}</pre>
                </div>
              ))}
            </div>
          )}
          <div {...stylex.props(styles.previewFoot)}>
            <span>{source?.name ?? 'Your next app'}</span>
            <span {...stylex.props(styles.hint)}>
              {project && project.current > 0 ? 'Undo restores code and saved app data.' : 'Fold it. Try both screens.'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

const MOBILE = '@media (max-width: 760px)'
const styles = stylex.create({
  workspace: {
    height: 'calc(100dvh - 60px)',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: { default: 24, [MOBILE]: 12 },
    paddingRight: { default: 24, [MOBILE]: 12 },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  title: { fontSize: 19, fontWeight: 600, margin: 0, letterSpacing: '-0.03em' },
  projectLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: color.text2 },
  select: {
    maxWidth: { default: 180, [MOBILE]: 100 },
    color: color.text,
    backgroundColor: color.bg,
    borderWidth: 0,
    fontSize: 13,
    padding: 8
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(340px, 400px) minmax(0, 1fr)', [MOBILE]: 'minmax(0, 1fr)' },
    flexGrow: 1,
    minHeight: 0
  },
  expanded: { gridTemplateColumns: 'minmax(0, 1fr)' },
  chat: {
    gridColumn: { default: 'auto', [MOBILE]: '1' },
    gridRow: { default: 'auto', [MOBILE]: '1' },
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: color.border,
    backgroundColor: color.surface
  },
  panelBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    flexShrink: 0,
    justifyContent: 'space-between'
  },
  label: { fontFamily: font.mono, fontSize: 10, letterSpacing: '0.08em', color: color.text2 },
  messages: { flexGrow: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: 24 },
  intro: { paddingTop: 18, paddingBottom: 24 },
  spark: { fontSize: 36, color: color.accent },
  headline: {
    fontFamily: font.display,
    fontSize: 38,
    lineHeight: 1.05,
    fontWeight: 600,
    letterSpacing: '-0.045em',
    marginTop: 22,
    marginBottom: 16
  },
  description: { fontSize: 14, lineHeight: 1.65, color: color.text2, maxWidth: 300 },
  suggestions: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22 },
  suggestion: {
    textAlign: 'left',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    backgroundColor: color.bg,
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: 10,
    fontSize: 13,
    cursor: 'pointer'
  },
  message: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 12,
    marginBottom: 12,
    overflowWrap: 'anywhere'
  },
  userMessage: { backgroundColor: color.well },
  messageText: { whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.65, marginTop: 8, marginBottom: 0 },
  composer: {
    flexShrink: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    maxHeight: '50%',
    overflowY: 'auto'
  },
  form: {
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    borderRadius: 14,
    backgroundColor: color.bg
  },
  textarea: {
    display: 'block',
    width: '100%',
    resize: 'vertical',
    boxSizing: 'border-box',
    borderWidth: 0,
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 1.5,
    paddingTop: 10,
    paddingBottom: 10,
    paddingInline: 0
  },
  actions: { display: 'flex', gap: 8, alignItems: 'center' },
  spacer: { flexGrow: 1 },
  button: {
    minHeight: 36,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: 8,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: 12,
    fontFamily: font.sans,
    cursor: { default: 'pointer', ':disabled': 'default' },
    opacity: { default: 1, ':disabled': 0.5 }
  },
  primary: { backgroundColor: color.accent, color: color.onAccent, borderColor: color.accent },
  status: { color: color.text2, fontSize: 12, minHeight: 20, marginBottom: 8 },
  error: { color: color.red, fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' },
  hint: { fontSize: 11, color: color.text2, lineHeight: 1.5 },
  privacy: { marginTop: 10, marginBottom: 0, color: color.text3, fontSize: 10, lineHeight: 1.5 },
  settings: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    maxHeight: '55%',
    overflowY: 'auto'
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: color.text2 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    borderRadius: 8,
    backgroundColor: color.bg,
    color: color.text,
    fontSize: 16,
    fontFamily: font.sans
  },
  preview: {
    gridColumn: { default: 'auto', [MOBILE]: '1' },
    gridRow: { default: 'auto', [MOBILE]: '1' },
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    position: 'relative'
  },
  phone: { flexGrow: 1, minHeight: 0, display: 'flex' },
  previewFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 18,
    fontSize: 12,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  source: {
    position: 'absolute',
    top: 58,
    bottom: 54,
    left: 12,
    right: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: 12,
    backgroundColor: color.surface,
    overflowY: 'auto',
    padding: 20,
    zIndex: 2
  },
  code: { fontFamily: font.mono, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  mobileTabs: {
    display: { default: 'none', [MOBILE]: 'flex' },
    gap: 8,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  // Keep the phone's paint callbacks alive while its mobile tab is hidden.
  mobileHidden: { opacity: { default: 1, [MOBILE]: 0 }, pointerEvents: { default: 'auto', [MOBILE]: 'none' } },
  hidden: { display: 'none' }
})
