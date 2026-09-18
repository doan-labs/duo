// Theme choice: system by default, or a saved light/dark pick. The class from
// tokens.stylex.ts is applied to <html> before hydration by BOOT so there is no
// flash, and the toggle in the nav flips it at runtime.
import * as stylex from '@stylexjs/stylex'
import { useSyncExternalStore } from 'react'
import { type color, dark, light } from './tokens.stylex'

export type Theme = 'system' | 'light' | 'dark'
const KEY = 'ipduo-theme'
// A theme can compile to more than one class, so each is kept as a token list.
const tokens = (t: stylex.Theme<typeof color>) => (stylex.props(t).className ?? '').split(' ').filter(Boolean)
export const CLASS = { light: tokens(light), dark: tokens(dark) }

/** Inline in <head>: read the saved pick and apply its class before first paint. */
export const BOOT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(KEY)});var c=${JSON.stringify(CLASS)};if(c[t])document.documentElement.classList.add.apply(document.documentElement.classList,c[t])}catch(e){}})()`

const listeners = new Set<() => void>()
function read(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' ? t : 'system'
}

export function setTheme(t: Theme) {
  const root = document.documentElement
  root.classList.remove(...CLASS.light, ...CLASS.dark)
  if (t === 'system') localStorage.removeItem(KEY)
  else {
    localStorage.setItem(KEY, t)
    root.classList.add(...CLASS[t])
  }
  for (const l of listeners) l()
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
    () => 'system'
  )
}
