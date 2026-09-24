// Sheet chrome shared by the add-city, alarm and sound pickers: a title row
// with Cancel / Done text buttons over a scrollable body, on UIKit's Sheet.

import { Sheet } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { styles } from './styles.ts'

export function ClockSheet({
  open,
  title,
  onClose,
  done,
  onDone,
  back,
  wide,
  children
}: {
  open: boolean
  title: string
  onClose: () => void
  done?: string
  onDone?: () => void
  /** Left button reads as a back affordance on sub-pages instead of "Cancel". */
  back?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Sheet open={open} onClose={onClose} xstyle={[wide && styles.sheetWide]}>
      <div {...stylex.props(styles.sheetHead)}>
        <button type="button" {...stylex.props(styles.sheetBtn, shared.press)} onClick={onClose}>
          {back ?? 'Cancel'}
        </button>
        <div {...stylex.props(styles.sheetTitle)}>{title}</div>
        {onDone ? (
          <button type="button" {...stylex.props(styles.sheetBtn, styles.sheetBtnBold, shared.press)} onClick={onDone}>
            {done ?? 'Add'}
          </button>
        ) : (
          // Balance the Cancel button so the title stays centred.
          <div aria-hidden="true" {...stylex.props(styles.sheetBtn, styles.ghostBtn)}>
            Cancel
          </div>
        )}
      </div>
      <div {...stylex.props(styles.sheetBody)}>{children}</div>
    </Sheet>
  )
}
