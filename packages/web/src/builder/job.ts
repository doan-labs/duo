/**
 * The workspace's one job value. Everything the builder can be doing is a
 * variant of `Job`, changed only through `nextJob`; the async drivers emit
 * `JobEvent`s and the UI derives its status text and busy flag from the job,
 * so an aborted or superseded job can no longer write into a newer one.
 * (decisions.md 114)
 */
export type Step =
  | 'generating'
  | 'repairing'
  | 'compiling'
  | 'starting-on-phone'
  | 'restoring'
  | 'testing'
  | 'booting'
  | 'waiting-for-phone'

export type Job =
  | { kind: 'booting' }
  | { kind: 'waiting-for-phone' }
  | { kind: 'phone-timed-out' }
  | { kind: 'generating'; chars: number }
  | { kind: 'repairing' }
  | { kind: 'compiling' }
  | { kind: 'starting-on-phone' }
  | { kind: 'restoring' }
  | { kind: 'testing' }
  | { kind: 'ready' }
  | { kind: 'stopped' }
  /** `step` is the phase it failed in; null when nothing was running (a late phone-connect failure). */
  | { kind: 'failed'; step: Step | null; label: string }

export type JobEvent =
  | { type: 'wait-for-phone' }
  | { type: 'phone-timed-out' }
  | { type: 'generate' }
  | { type: 'progress'; chars: number }
  | { type: 'repair' }
  | { type: 'compile' }
  | { type: 'starting-on-phone' }
  | { type: 'restore' }
  | { type: 'test' }
  | { type: 'ready' }
  | { type: 'stop' }
  | { type: 'failed'; label: string }

const ACTIVE: ReadonlySet<Job['kind']> = new Set([
  'booting',
  'waiting-for-phone',
  'generating',
  'repairing',
  'compiling',
  'starting-on-phone',
  'restoring',
  'testing'
])

export const nextJob = (job: Job, event: JobEvent): Job => {
  switch (event.type) {
    case 'wait-for-phone':
      return { kind: 'waiting-for-phone' }
    case 'phone-timed-out':
      // Only the wait can time out; a late timer firing in another phase is ignored.
      return job.kind === 'waiting-for-phone' || job.kind === 'booting' ? { kind: 'phone-timed-out' } : job
    case 'generate':
      return { kind: 'generating', chars: 0 }
    case 'progress':
      return job.kind === 'generating' ? { kind: 'generating', chars: event.chars } : job
    case 'repair':
      return { kind: 'repairing' }
    case 'compile':
      return { kind: 'compiling' }
    case 'starting-on-phone':
      return { kind: 'starting-on-phone' }
    case 'restore':
      return { kind: 'restoring' }
    case 'test':
      return { kind: 'testing' }
    case 'ready':
      return { kind: 'ready' }
    case 'stop':
      return jobBusy(job) ? { kind: 'stopped' } : job
    case 'failed':
      return { kind: 'failed', step: ACTIVE.has(job.kind) ? (job.kind as Step) : null, label: event.label }
  }
}

export const jobBusy = (job: Job) => ACTIVE.has(job.kind)

export const jobStatus = (job: Job): string => {
  switch (job.kind) {
    case 'booting':
      return 'Loading workspace'
    case 'waiting-for-phone':
      return 'Starting the phone'
    case 'phone-timed-out':
      return 'Simulator not responding'
    case 'generating':
      return job.chars ? `Generating · ${job.chars.toLocaleString()} characters` : 'Generating'
    case 'repairing':
      return 'Repairing once · uses another provider request'
    case 'compiling':
      return 'Compiling your app'
    case 'starting-on-phone':
      return 'Starting on the phone'
    case 'restoring':
      return 'Restoring revision'
    case 'testing':
      return 'Testing connection'
    case 'ready':
      return 'Ready'
    case 'stopped':
      return 'Stopped'
    case 'failed':
      return job.step ? `${job.label} while ${DOING[job.step]}` : job.label
  }
}

/** The failed phase, as the tail of "<label> while …". */
const DOING: Record<Step, string> = {
  generating: 'generating',
  repairing: 'repairing',
  compiling: 'compiling',
  'starting-on-phone': 'starting on the phone',
  restoring: 'restoring',
  testing: 'testing the connection',
  booting: 'loading the workspace',
  'waiting-for-phone': 'starting the phone'
}
