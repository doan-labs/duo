// The one bridge to the desktop shell. Components import from here, never from
// the Tauri API directly, so swapping the shell touches this file only.
// In a plain browser every call resolves to a sensible default.
import { invoke } from '@tauri-apps/api/core'

export const isDesktop = '__TAURI_INTERNALS__' in window

export const platformName = (): Promise<string> =>
  isDesktop ? invoke<string>('platform_name') : Promise.resolve('web')

/** Open a link outside the device: the OS browser on desktop, a new tab on the web. */
export const openExternal = (url: string): Promise<void> =>
  isDesktop ? invoke('open_url', { url }) : Promise.resolve(void window.open(url, '_blank', 'noopener,noreferrer'))
