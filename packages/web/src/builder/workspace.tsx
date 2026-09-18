import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Simulator } from '../simulator'
import { color, font, radius } from '../tokens.stylex'
import { compile } from './compiler'
import { PreviewClient } from './preview-client'
import { downloadProject, listProjects, newProject, saveProject } from './projects'
import { prompt } from './prompt'
import { type Connection, completion, models, PROVIDERS } from './provider'
import { type Project, parseResponse, type Source } from './types'

const SUGGESTIONS = ['Make me a timer app', 'Build a simple notes app', 'Make a daily habit counter']

/** `upcoming` shows the workspace with the phone live and the chat side switched off. */
export function Workspace({ upcoming = false }: { upcoming?: boolean }) {
  const [project, setProject] = useState<Project>()
  const [projects, setProjects] = useState<Project[]>([])
  const [connection, setConnection] = useState<Connection>({
    endpoint: PROVIDERS[0]!.endpoint,
    model: PROVIDERS[0]!.model,
    key: ''
  })
  const [custom, setCustom] = useState(false)
  const [modelList, setModelList] = useState<string[]>([])
  const [modelNote, setModelNote] = useState('')
  const [settings, setSettings] = useState(false)
  const [tab, setTab] = useState<'chat' | 'preview'>('chat')
  const [mobile, setMobile] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [mode, setMode] = useState<'simulator' | 'build'>(upcoming ? 'simulator' : 'build')
  const [text, setText] = useState('')
  const [stage, setStage] = useState('Loading workspace')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(!upcoming)
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
      if (typeof preferences.endpoint === 'string' && typeof preferences.model === 'string') {
        setConnection({ ...preferences, key: '' })
        setCustom(!PROVIDERS.some((p) => p.endpoint === preferences.endpoint))
      }
    } catch {
      /* Connection preferences are optional. */
    }
    return () => {
      alive.current = false
      controller.current?.abort()
    }
  }, [])
  useEffect(() => () => client?.dispose(), [client])
  // A phone that never answers should say so rather than leave the page on "Loading workspace".
  useEffect(() => {
    if (!token || client || upcoming) return
    const timer = setTimeout(() => {
      setBusy(false)
      setStage('Simulator not responding')
      setError(
        import.meta.env.DEV
          ? 'The phone did not start. Check that `bun run dev` is serving the shell on port 3000, then reload.'
          : 'The phone did not start. Reload the page; if it keeps failing, the simulator files may be missing.'
      )
    }, 30_000)
    return () => clearTimeout(timer)
  }, [token, client, upcoming])
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
  // The model list follows the endpoint and key while the panel is open; typing a key waits half a second.
  const { endpoint, key } = connection
  useEffect(() => {
    if (!settings) return
    const control = new AbortController()
    const timer = setTimeout(() => {
      setModelNote('Loading models')
      models({ endpoint, key, model: '' }, control.signal)
        .then((list) => {
          setModelList(list)
          setModelNote(
            list.length ? `${list.length} models available. Type to search.` : 'No models listed. Type an ID.'
          )
        })
        .catch(() => {
          if (control.signal.aborted) return
          setModelList([])
          setModelNote(key.trim() ? 'Could not list models. Type an ID.' : 'Add a key to list models, or type an ID.')
        })
    }, 500)
    return () => {
      clearTimeout(timer)
      control.abort()
    }
  }, [settings, endpoint, key])

  function updateConnection(next: Connection) {
    setConnection(next)
    try {
      localStorage.setItem('duo-builder-connection', JSON.stringify({ endpoint: next.endpoint, model: next.model }))
    } catch {
      /* Optional preferences. */
    }
  }
  function pickProvider(id: string) {
    const preset = PROVIDERS.find((p) => p.id === id)
    setCustom(!preset)
    if (preset) updateConnection({ endpoint: preset.endpoint, model: preset.model, key: '' })
  }
  async function run(message = text) {
    if (!project || !client || busy || !message.trim()) return
    if (!connection.key.trim() || !connection.model.trim()) {
      setSettings(true)
      setText(message)
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
  const provider = custom ? undefined : PROVIDERS.find((p) => p.endpoint === connection.endpoint)
  const connected = Boolean(connection.key.trim() && connection.model.trim())
  const working = busy && stage !== 'Ready'
  return (
    <section {...stylex.props(styles.workspace)} data-builder data-lenis-prevent>
      <div {...stylex.props(styles.toolbar)}>
        <div {...stylex.props(styles.toolbarSide)}>
          <span {...stylex.props(styles.appName)}>{upcoming ? 'Duo' : (source?.name ?? 'Your app')}</span>
          <span {...stylex.props(styles.hint, styles.desktopOnly)}>
            {project && project.revisions.length > 1
              ? `Revision ${project.current + 1} of ${project.revisions.length}`
              : 'Fold it. Try both screens.'}
          </span>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset does not lay out as a grid item in WebKit. */}
        <div role="group" aria-label="Mode" {...stylex.props(styles.seg)}>
          {(['simulator', 'build'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m)
                setTab(m === 'build' ? 'chat' : 'preview')
              }}
              {...stylex.props(styles.segButton, mode === m && styles.segOn)}
            >
              {m === 'simulator' ? 'Simulator' : 'Build'}
              {m === 'build' && upcoming && <span {...stylex.props(styles.segNote)}>soon</span>}
            </button>
          ))}
        </div>
        <div {...stylex.props(styles.toolbarSide, styles.toolbarEnd)}>
          {!upcoming && (
            <>
              <button
                type="button"
                title="Restore the previous code and its saved app data"
                disabled={busy || !project || project.current === 0}
                onClick={() => project && void restore(project.current - 1)}
                {...stylex.props(styles.button)}
              >
                Undo
              </button>
              <button
                type="button"
                aria-pressed={sourceOpen}
                onClick={() => setSourceOpen(!sourceOpen)}
                {...stylex.props(styles.button, sourceOpen && styles.buttonOn)}
              >
                Source
              </button>
            </>
          )}
        </div>
      </div>
      <div {...stylex.props(styles.mobileTabs, mode === 'simulator' && styles.hidden)}>
        <button
          type="button"
          aria-pressed={tab === 'chat'}
          onClick={() => setTab('chat')}
          {...stylex.props(styles.button, tab === 'chat' && styles.buttonOn)}
        >
          Chat
        </button>
        <button
          type="button"
          aria-pressed={tab === 'preview'}
          onClick={() => setTab('preview')}
          {...stylex.props(styles.button, tab === 'preview' && styles.buttonOn)}
        >
          Preview
        </button>
      </div>
      <div {...stylex.props(styles.columns, mode === 'simulator' && styles.expanded)}>
        <div
          inert={mobile && tab !== 'chat'}
          aria-hidden={mobile && tab !== 'chat'}
          {...stylex.props(styles.chat, tab !== 'chat' && styles.mobileHidden, mode === 'simulator' && styles.hidden)}
        >
          <div {...stylex.props(styles.panelBar)}>
            {upcoming && (
              <>
                <span {...stylex.props(styles.appName)}>Build</span>
                <span {...stylex.props(styles.badge)}>Upcoming</span>
              </>
            )}
            {!upcoming && (
              <>
                <select
                  aria-label="Project"
                  value={project?.id ?? ''}
                  disabled={busy}
                  onChange={(e) => setProject(projects.find((p) => p.id === e.target.value))}
                  {...stylex.props(styles.button, styles.select)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title={projects.length >= 10 ? 'Ten projects are kept locally' : 'Start a new app'}
                  disabled={busy || projects.length >= 10}
                  onClick={() => setProject(newProject())}
                  {...stylex.props(styles.button)}
                >
                  New app
                </button>
                <div {...stylex.props(styles.spacer)} />
                <button
                  type="button"
                  title="Download the source as JSON"
                  disabled={!project}
                  onClick={() => project && downloadProject(project)}
                  {...stylex.props(styles.button)}
                >
                  Download
                </button>
              </>
            )}
          </div>
          <div ref={scroller} {...stylex.props(styles.messages)}>
            {!project?.messages.length && (
              <div {...stylex.props(styles.intro)}>
                <span {...stylex.props(styles.spark)}>✳</span>
                <h1 {...stylex.props(styles.headline)}>
                  An idea.
                  <br />A working app.
                </h1>
                <p {...stylex.props(styles.description)}>
                  {upcoming
                    ? 'Describe an app and watch it run on the phone. Chat opens soon. Until then, fold it, tap it and try the apps.'
                    : 'Describe what you want. Try it on the phone. Change it one message at a time.'}
                </p>
                <div {...stylex.props(styles.suggestions)}>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      disabled={busy || upcoming}
                      onClick={() => void run(suggestion)}
                      {...stylex.props(styles.suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {project?.messages.map((message) => (
              <div key={message.id} {...stylex.props(styles.message, message.role === 'user' && styles.userMessage)}>
                <span {...stylex.props(styles.label)}>{message.role === 'user' ? 'You' : 'Duo'}</span>
                <p {...stylex.props(styles.messageText)}>{message.content}</p>
              </div>
            ))}
          </div>
          {upcoming && (
            <div {...stylex.props(styles.composer)}>
              <p {...stylex.props(styles.hint)}>Chat and AI builds are in development. The phone is real: try it.</p>
            </div>
          )}
          {!upcoming && (
            <div {...stylex.props(styles.composer)}>
              {settings && (
                <div {...stylex.props(styles.settings)}>
                  <div {...stylex.props(styles.settingsHead)}>
                    <div>
                      <div {...stylex.props(styles.settingsTitle)}>Connection</div>
                      <div {...stylex.props(styles.hint)}>
                        Your key stays in this tab and goes only to the provider.
                      </div>
                    </div>
                    <div {...stylex.props(styles.spacer)} />
                    <button
                      type="button"
                      aria-label="Close connection"
                      onClick={() => setSettings(false)}
                      {...stylex.props(styles.button, styles.iconButton)}
                    >
                      ✕
                    </button>
                  </div>
                  <div {...stylex.props(styles.fields)}>
                    <label {...stylex.props(styles.field)}>
                      Provider
                      <select
                        value={provider?.id ?? 'custom'}
                        disabled={busy}
                        onChange={(e) => pickProvider(e.target.value)}
                        {...stylex.props(styles.input)}
                      >
                        {PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        <option value="custom">Custom endpoint</option>
                      </select>
                    </label>
                    <div {...stylex.props(styles.field)}>
                      <span {...stylex.props(styles.fieldRow)}>
                        <label htmlFor="builder-key">API key</label>
                        {provider && (
                          <a href={provider.keys} target="_blank" rel="noreferrer" {...stylex.props(styles.link)}>
                            Get a key ↗
                          </a>
                        )}
                      </span>
                      <input
                        id="builder-key"
                        type="password"
                        autoComplete="off"
                        data-private
                        placeholder={provider ? `${provider.name} key` : 'Bearer token'}
                        value={connection.key}
                        disabled={busy}
                        onChange={(e) => setConnection({ ...connection, key: e.target.value })}
                        {...stylex.props(styles.input)}
                      />
                    </div>
                    {custom && (
                      <label {...stylex.props(styles.field, styles.wide)}>
                        API base URL
                        <input
                          type="url"
                          placeholder="https://example.com/v1"
                          value={connection.endpoint}
                          disabled={busy}
                          onChange={(e) => updateConnection({ ...connection, endpoint: e.target.value, key: '' })}
                          {...stylex.props(styles.input)}
                        />
                      </label>
                    )}
                    <div {...stylex.props(styles.field, styles.wide)}>
                      <span {...stylex.props(styles.fieldRow)}>
                        <label htmlFor="builder-model">Model</label>
                        <span {...stylex.props(styles.hint)}>{modelNote}</span>
                      </span>
                      <input
                        id="builder-model"
                        list="builder-models"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Model ID"
                        value={connection.model}
                        disabled={busy}
                        onChange={(e) => updateConnection({ ...connection, model: e.target.value })}
                        {...stylex.props(styles.input)}
                      />
                      <datalist id="builder-models">
                        {modelList.map((id) => (
                          <option key={id} value={id} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div {...stylex.props(styles.actions)}>
                    <button
                      type="button"
                      disabled={busy || !connected}
                      onClick={testConnection}
                      {...stylex.props(styles.button)}
                    >
                      Test connection
                    </button>
                    <button
                      type="button"
                      disabled={busy || !connection.key}
                      onClick={() => setConnection({ ...connection, key: '' })}
                      {...stylex.props(styles.button)}
                    >
                      Clear key
                    </button>
                    <span {...stylex.props(styles.hint)}>
                      Test sends one tiny paid request. Custom endpoints must allow browser access.
                    </span>
                  </div>
                </div>
              )}
              {(error || saveError) && (
                <p role="alert" {...stylex.props(styles.error)}>
                  {error || saveError}
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void run()
                }}
                {...stylex.props(styles.form, working && styles.formBusy)}
              >
                <textarea
                  aria-label="Describe your app or ask for a change"
                  value={text}
                  disabled={upcoming}
                  maxLength={8000}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      void run()
                    }
                  }}
                  placeholder={
                    upcoming
                      ? 'Chat opens when Build ships'
                      : project?.messages.length
                        ? 'Ask for a change…'
                        : 'Describe your app…'
                  }
                  rows={1}
                  {...stylex.props(styles.textarea)}
                />
                <div {...stylex.props(styles.actions)}>
                  {!upcoming && (
                    <button
                      type="button"
                      aria-label="Connection"
                      aria-expanded={settings}
                      title={
                        connected
                          ? `${provider?.name ?? connection.endpoint} · ${connection.model}`
                          : 'Connect a provider'
                      }
                      onClick={() => setSettings(!settings)}
                      {...stylex.props(styles.chip, !connected && styles.chipOff)}
                    >
                      <span {...stylex.props(styles.dot, connected && styles.dotOn)} aria-hidden="true" />
                      <span {...stylex.props(styles.chipText)}>
                        {connected ? connection.model : 'Connect a provider'}
                      </span>
                    </button>
                  )}
                  <span role="status" aria-live="polite" {...stylex.props(styles.status)}>
                    {working && <span {...stylex.props(styles.pulse)} aria-hidden="true" />}
                    {stage}
                  </span>
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
                    <button
                      key="build"
                      type="submit"
                      disabled={upcoming || !text.trim()}
                      {...stylex.props(styles.button, styles.primary)}
                    >
                      {project?.messages.length ? 'Update app ↗' : 'Build app ↗'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
        <div
          inert={mobile && mode === 'build' && tab !== 'preview'}
          aria-hidden={mobile && mode === 'build' && tab !== 'preview'}
          {...stylex.props(styles.preview, mode === 'build' && tab !== 'preview' && styles.mobileHidden)}
        >
          <div inert={sourceOpen} {...stylex.props(styles.phone)}>
            {token && <Simulator eager fill builder={upcoming ? undefined : token} onBuilderReady={frameReady} />}
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
        </div>
      </div>
    </section>
  )
}

const MOBILE = '@media (max-width: 760px)'
const pulse = stylex.keyframes({ '0%, 100%': { opacity: 0.3 }, '50%': { opacity: 1 } })
const styles = stylex.create({
  workspace: {
    height: 'calc(100dvh - 60px)',
    minHeight: 0,
    width: '100%',
    maxWidth: 1280,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: { default: 22, [MOBILE]: 0 },
    paddingRight: { default: 22, [MOBILE]: 0 },
    paddingBottom: { default: 22, [MOBILE]: 0 },
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  toolbar: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) auto minmax(0, 1fr)', [MOBILE]: 'auto minmax(0, 1fr)' },
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingLeft: { default: 4, [MOBILE]: 12 },
    paddingRight: { default: 4, [MOBILE]: 12 },
    flexShrink: 0
  },
  toolbarSide: { display: { default: 'flex', [MOBILE]: 'none' }, alignItems: 'center', gap: 8, minWidth: 0 },
  toolbarEnd: { display: 'flex', justifyContent: 'flex-end' },
  columns: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(360px, 420px) minmax(0, 1fr)', [MOBILE]: 'minmax(0, 1fr)' },
    flexGrow: 1,
    minHeight: 0,
    borderWidth: { default: 1, [MOBILE]: 0 },
    borderTopWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: { default: radius.md, [MOBILE]: 0 },
    overflow: 'hidden'
  },
  expanded: { gridTemplateColumns: 'minmax(0, 1fr)' },
  chat: {
    gridColumn: { default: 'auto', [MOBILE]: '1' },
    gridRow: { default: 'auto', [MOBILE]: '1' },
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderRightWidth: { default: 1, [MOBILE]: 0 },
    borderRightStyle: 'solid',
    borderRightColor: color.border,
    backgroundColor: color.surface
  },
  panelBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    flexShrink: 0
  },
  appName: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' },
  badge: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: color.accent,
    backgroundColor: color.accentSoft,
    borderRadius: radius.pill,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8
  },
  label: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: color.text2
  },
  messages: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20
  },
  intro: { paddingTop: 8 },
  spark: { fontSize: 28, color: color.accent, lineHeight: 1 },
  headline: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 1.05,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    marginTop: 14,
    marginBottom: 10
  },
  description: { fontSize: 14, lineHeight: 1.6, color: color.text2, maxWidth: 320, marginTop: 0, marginBottom: 0 },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  suggestion: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 14,
    paddingRight: 14,
    backgroundColor: { default: color.bg, ':hover': color.accentSoft },
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.pill,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 1.4,
    cursor: { default: 'pointer', ':disabled': 'default' },
    opacity: { default: 1, ':disabled': 0.5 },
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.15s'
  },
  message: { marginBottom: 16, overflowWrap: 'anywhere' },
  userMessage: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: radius.md,
    backgroundColor: color.well
  },
  messageText: { whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, marginTop: 6, marginBottom: 0 },
  composer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  form: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { default: color.border, ':focus-within': color.borderStrong },
    borderRadius: radius.md,
    backgroundColor: color.bg,
    transitionProperty: 'border-color',
    transitionDuration: '0.15s'
  },
  formBusy: { borderColor: color.accentSoft },
  textarea: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'none',
    fieldSizing: 'content',
    minHeight: 44,
    maxHeight: 200,
    borderWidth: 0,
    outline: 'none',
    backgroundColor: 'transparent',
    color: color.text,
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 1.5,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 6,
    paddingRight: 6
  },
  actions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 },
  spacer: { flexGrow: 1 },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': color.accentSoft },
    color: color.text,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: font.sans,
    whiteSpace: 'nowrap',
    cursor: { default: 'pointer', ':disabled': 'default' },
    opacity: { default: 1, ':disabled': 0.4 },
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.15s'
  },
  buttonOn: { backgroundColor: color.accentSoft, borderColor: color.accent },
  iconButton: { width: 32, paddingLeft: 0, paddingRight: 0, fontSize: 12 },
  desktopOnly: { display: { default: 'inline-flex', [MOBILE]: 'none' } },
  seg: {
    display: 'inline-flex',
    padding: 3,
    gap: 2,
    borderRadius: radius.pill,
    backgroundColor: color.well,
    justifySelf: 'center'
  },
  segButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingLeft: 16,
    paddingRight: 16,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: { default: color.text2, ':hover': color.text },
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.15s'
  },
  segOn: { backgroundColor: color.surface, color: color.text, boxShadow: color.shadow },
  segNote: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: color.accent
  },
  select: { maxWidth: 200, paddingRight: 28, textOverflow: 'ellipsis', appearance: 'auto' },
  primary: {
    backgroundColor: { default: color.accent, ':hover': color.accentHover },
    borderColor: { default: color.accent, ':hover': color.accentHover },
    color: color.onAccent
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    maxWidth: 200,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.pill,
    backgroundColor: { default: color.surface, ':hover': color.well },
    color: color.text2,
    fontFamily: font.mono,
    fontSize: 11,
    cursor: 'pointer'
  },
  chipOff: { color: color.accent, borderColor: color.accent, fontFamily: font.sans, fontWeight: 500, fontSize: 12 },
  chipText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: color.accent, flexShrink: 0 },
  dotOn: { backgroundColor: color.green },
  status: { display: 'inline-flex', alignItems: 'center', gap: 6, color: color.text3, fontSize: 12, minWidth: 0 },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    animationName: pulse,
    animationDuration: '1.2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite'
  },
  error: { color: color.red, fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere', marginTop: 0, marginBottom: 0 },
  hint: { fontSize: 12, color: color.text3, lineHeight: 1.5, minWidth: 0 },
  link: { color: color.accent, fontSize: 12, textDecoration: { default: 'none', ':hover': 'underline' } },
  settings: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.bg
  },
  settingsHead: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  settingsTitle: { fontSize: 14, fontWeight: 600, marginBottom: 2 },
  fields: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 },
  wide: { gridColumn: '1 / -1' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: color.text2 },
  fieldRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  input: {
    width: '100%',
    height: 36,
    boxSizing: 'border-box',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { default: color.border, ':focus': color.accent },
    borderRadius: radius.sm,
    outline: 'none',
    backgroundColor: color.surface,
    color: color.text,
    fontSize: 14,
    fontWeight: 400,
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
  source: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    overflowY: 'auto',
    padding: 20,
    zIndex: 2
  },
  code: {
    fontFamily: font.mono,
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    marginTop: 8,
    marginBottom: 0
  },
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
