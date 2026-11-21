import { expect, test } from 'bun:test'
import { type Job, jobBusy, jobStatus, nextJob } from './job'

const run: Job[] = []
const drive = (start: Job, events: Parameters<typeof nextJob>[1][]) =>
  events.reduce((job, event) => {
    const next = nextJob(job, event)
    run.push(next)
    return next
  }, start)

test('a generation run walks generating -> compiling -> starting-on-phone -> ready', () => {
  const end = drive({ kind: 'ready' }, [
    { type: 'generate' },
    { type: 'progress', chars: 1200 },
    { type: 'compile' },
    { type: 'starting-on-phone' },
    { type: 'ready' }
  ])
  expect(end).toEqual({ kind: 'ready' })
  expect(run[0]).toEqual({ kind: 'generating', chars: 0 })
  expect(jobStatus(run[1]!)).toBe('Generating · 1,200 characters')
  expect(jobBusy(end)).toBe(false)
})

test('a mid-run failure records the step it failed in', () => {
  const end = drive({ kind: 'ready' }, [{ type: 'restore' }, { type: 'failed', label: 'Restore failed' }])
  expect(end).toEqual({ kind: 'failed', step: 'restoring', label: 'Restore failed' })
  expect(jobStatus(end)).toBe('Restore failed while restoring')
  // Nothing running: the label alone.
  const late = nextJob({ kind: 'ready' }, { type: 'failed', label: 'Simulator not responding' })
  expect(jobStatus(late)).toBe('Simulator not responding')
  expect(jobBusy(end)).toBe(false)
})

test('a stale phone timer cannot regress a later phase', () => {
  const compiling = drive({ kind: 'waiting-for-phone' }, [{ type: 'compile' }])
  expect(nextJob(compiling, { type: 'phone-timed-out' })).toEqual({ kind: 'compiling' })
  const waiting = nextJob({ kind: 'booting' }, { type: 'wait-for-phone' })
  expect(nextJob(waiting, { type: 'phone-timed-out' })).toEqual({ kind: 'phone-timed-out' })
})

test('progress outside generating is dropped; stop only lands while busy', () => {
  const ready: Job = { kind: 'ready' }
  expect(nextJob(ready, { type: 'progress', chars: 5 })).toEqual(ready)
  expect(nextJob(ready, { type: 'stop' })).toEqual(ready)
  const generating: Job = { kind: 'generating', chars: 10 }
  expect(nextJob(generating, { type: 'stop' })).toEqual({ kind: 'stopped' })
})

test('a passed connection test ends idle and says the connection works', () => {
  const end = drive({ kind: 'ready' }, [{ type: 'test' }, { type: 'tested' }])
  expect(end).toEqual({ kind: 'tested' })
  expect(jobBusy(end)).toBe(false)
  expect(jobStatus(end)).toBe('Connection works')
})
