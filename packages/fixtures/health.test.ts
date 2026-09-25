import { describe, expect, test } from 'bun:test'
import { day, dayFrac, log, logWorkout, measure, removeWorkout, rings, series, todayKey } from './health.ts'

describe('health book', () => {
  test('a date reads the same every time', () => {
    const a = day('2026-03-04')
    const b = day('2026-03-04')
    expect(a).toEqual(b)
    expect(a.steps).toBeGreaterThan(0)
    expect(a.sleep.asleep).toBeGreaterThan(0)
  })

  test('dayFrac climbs through waking hours and stops at 1', () => {
    expect(dayFrac(0)).toBeLessThan(0.2)
    expect(dayFrac(12)).toBeGreaterThan(dayFrac(9))
    expect(dayFrac(24)).toBe(1)
  })

  test('logging adds on top of the seed and stays whole today', () => {
    const key = todayKey()
    const before = day(key).waterMl
    log('waterMl', 250, key)
    expect(day(key).waterMl).toBe(before + 250)
  })

  test('a logged workout feeds the rings and reverses on delete', () => {
    const key = todayKey()
    const [m0, e0] = rings(key)
    const id = logWorkout({ kind: 'run', at: `${key}T08:00:00`, mins: 30, kcal: 320, km: 5, avgHr: 140 })
    const [m1, e1] = rings(key)
    expect(m1.done).toBe(m0.done + 320)
    expect(e1.done).toBe(e0.done + 30)
    removeWorkout(id)
    const [m2, e2] = rings(key)
    expect(m2.done).toBe(m0.done)
    expect(e2.done).toBe(e0.done)
  })

  test('a weigh-in overrides the seed absolutely', () => {
    const key = todayKey()
    measure('weightKg', 80.5, key)
    expect(day(key).weightKg).toBe(80.5)
  })

  test('series span the asked range', () => {
    expect(series((d) => d.steps, 'W').length).toBe(7)
    expect(series((d) => d.steps, 'M').length).toBe(30)
    expect(series((d) => d.steps, 'Y').length).toBe(12)
    expect(series((d) => d.steps, 'Y').at(-1)!.value).toBeGreaterThan(0)
  })
})
