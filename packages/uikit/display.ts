import { os, type ViewInfo } from '@doan-labs/duo-sdk'
import { useSyncExternalStore } from 'react'

/** Current SDK display snapshot. Subscribes only; the app explicitly connects the SDK. */
export function useDisplay(): ViewInfo {
  return useSyncExternalStore(
    os.onView,
    () => os.view,
    () => os.view
  )
}
