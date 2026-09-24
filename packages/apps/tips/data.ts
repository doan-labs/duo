// What Tips teaches. Every tip describes a control the simulator actually has, in
// the words docs/working.md uses for it; nothing here promises a gesture the shell
// does not answer.

import type { SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'

export type Tip = {
  id: string
  title: string
  /** One line under the title on a card; the first thing read on the page. */
  summary: string
  /** Paragraphs of the tip itself. */
  body: string[]
  /** Numbered steps, when the tip is something to do rather than something to know. */
  steps?: string[]
  glyph: SymProps['name']
}

export type Collection = {
  id: string
  title: string
  blurb: string
  glyph: SymProps['name']
  art: string
  tips: Tip[]
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'start',
    title: 'Get Started',
    blurb: 'The fold, the two displays and the gestures that move between them.',
    glyph: 'iphone',
    art: appAppearance.tipsCool,
    tips: [
      {
        id: 'fold',
        title: 'Two displays, one app',
        summary: 'Open the Duo and what you were looking at widens into the inner display.',
        body: [
          'The cover display is what you see with the Duo closed. Open it past 40 degrees and the same app hands over to the inner display, twice as wide, without starting again.',
          'Close it and the view snaps back to the cover, keeping your place. Every app runs a copy on each display so the hand-over is a change of width, never a reload.'
        ],
        steps: [
          'Drag the fold slider under the phone, or drag the hinge itself.',
          'Watch the active display change at 40°.'
        ],
        glyph: 'flip'
      },
      {
        id: 'home',
        title: 'Go Home from anywhere',
        summary: 'Swipe up from the home bar, or press Esc, on either display.',
        body: [
          'The bar along the bottom edge is the home bar. A short swipe up takes both displays home at once.',
          'Going Home parks an app rather than closing it. It stays where you left it, and the switcher can bring it straight back.'
        ],
        glyph: 'up'
      },
      {
        id: 'switcher',
        title: 'Switch between apps',
        summary: 'Hold the home bar a moment and every running app fans out as a card.',
        body: [
          'Swipe the home bar up and hold for a beat before letting go. Each running app appears as a live card.',
          'Tap a card to bring that app back exactly as it was. Flick a card up to quit it, or tap the wallpaper to go Home.'
        ],
        steps: [
          'Swipe up from the home bar and hold.',
          'Let go once the cards appear.',
          'Tap a card, or flick one up to quit it.'
        ],
        glyph: 'tabs'
      },
      {
        id: 'lock',
        title: 'Lock and wake',
        summary: 'The side button sleeps the display; a tap or a click wakes it.',
        body: [
          'Press the side button, or the L key, to lock the Duo. Press it again to wake to the lock screen, then swipe up from the bottom to unlock.',
          'Hold the side button to bring up Siri. Hold it together with a volume button for the power-off slider.'
        ],
        glyph: 'lock'
      }
    ]
  },
  {
    id: 'split',
    title: 'Side by Side',
    blurb: 'Use the inner display for two apps at once.',
    glyph: 'sidebar',
    art: appAppearance.tipsWarm,
    tips: [
      {
        id: 'split-open',
        title: 'Put two apps side by side',
        summary: 'Drag an app card to one half of the inner display.',
        body: [
          'With the Duo open, swipe the home bar up and hold until the app lifts as a card. Drag it sideways and drop it on the left or right half.',
          'The other half stays with whatever was there. Drop onto an occupied half and the two swap; drop on the hinge to cancel.'
        ],
        steps: [
          'Swipe up from the home bar and hold.',
          'Drag the card to a half of the display.',
          'Let go to place it.'
        ],
        glyph: 'sidebar'
      },
      {
        id: 'divider',
        title: 'Resize the split',
        summary: 'Drag the pill on the seam to give one side more room.',
        body: [
          'Once an app sits on each half, a small pill appears on the seam between them. Drag it to move the divider anywhere between 30 and 70 percent.',
          'When one app leaves, the divider returns to the middle for the next pair.'
        ],
        glyph: 'aspect'
      },
      {
        id: 'split-fold',
        title: 'Fold with a split open',
        summary: 'Closing the Duo keeps the app that was on the cover side.',
        body: [
          'The cover display shows the left half of the inner display. Close the Duo with two apps open and the left one carries on at cover width.',
          'Open it again and the split comes back exactly as you left it.'
        ],
        glyph: 'flip'
      }
    ]
  },
  {
    id: 'home-screen',
    title: 'Home Screen',
    blurb: 'Folders, widgets, wallpaper and Spotlight.',
    glyph: 'grid',
    art: appAppearance.tipsPink,
    tips: [
      {
        id: 'folder',
        title: 'Make a folder',
        summary: 'Hold one icon and drop it on another.',
        body: [
          'Press and hold an app icon for half a second until it lifts, carry it onto another icon and let go. The two share a folder.',
          'Tap the folder to open it. Tap its name to rename it. To take an app out, hold its icon inside the folder and let go outside the well. A folder down to one app dissolves on its own.'
        ],
        steps: ['Hold an icon for half a second.', 'Drag it onto another icon or an existing folder.', 'Let go.'],
        glyph: 'folder'
      },
      {
        id: 'wallpaper',
        title: 'Change the wallpaper',
        summary: 'Hold the wallpaper itself, then tap a swatch.',
        body: [
          'Press and hold an empty part of the home screen for half a second. A sheet of swatches slides up: the dune, the gradients, the shots you have taken with Camera, and a plus for a picture of your own.',
          'Tap outside the sheet to put it away.'
        ],
        glyph: 'photo'
      },
      {
        id: 'widgets',
        title: 'Widgets stay on the cover',
        summary: 'The left four columns are exactly what the cover display shows.',
        body: [
          'The home screen is one grid across both displays. Fold the Duo and the cover shows its left half, widgets included, so what you put there is always in reach.',
          'A widget is a snapshot the shell draws, with its age shown beside it, rather than the app running live.'
        ],
        glyph: 'grid'
      },
      {
        id: 'spotlight',
        title: 'Search for an app',
        summary: 'Swipe down on the home screen to search everything, including Utilities.',
        body: [
          'Pull down on the home screen wallpaper to open Spotlight. Type a few letters and every app answers, including the ones tucked inside the Utilities folder.',
          'Tap a result to open it, on whichever display you are using.'
        ],
        glyph: 'search'
      }
    ]
  },
  {
    id: 'controls',
    title: 'Buttons and Controls',
    blurb: 'The side button, Camera Control, volume and Control Center.',
    glyph: 'gear',
    art: appAppearance.tipsGreen,
    tips: [
      {
        id: 'control-center',
        title: 'Open Control Center',
        summary: 'Pull down from the very top of either display.',
        body: [
          'Swipe down from the top edge, where the status stack sits, and Control Center drops over the display. Radios, focus, brightness and volume are all there.',
          'Swipe the home bar, tap outside the panel or press Esc to dismiss it.'
        ],
        glyph: 'more'
      },
      {
        id: 'camera-control',
        title: 'Use Camera Control',
        summary: 'Click to open Camera, click again to take the shot.',
        body: [
          'The Camera Control button on the right edge, or the C key, opens Camera even from the lock screen. Once Camera is open, a click takes the photo.',
          'Hold it for a moment to record until you let go. Slide along it to zoom, doubling for every centimetre.'
        ],
        steps: [
          'Click Camera Control to open Camera.',
          'Click again for the shutter.',
          'Hold to record, slide to zoom.'
        ],
        glyph: 'exposure'
      },
      {
        id: 'screenshot',
        title: 'Take a screenshot',
        summary: 'Click the side button and a volume button together.',
        body: [
          'Press the side button and either volume button at the same time. Both displays flash and the shot lands in Photos.',
          'Hold the same two buttons for a second and you get the power-off slider instead.'
        ],
        glyph: 'screenshot'
      },
      {
        id: 'wallet',
        title: 'Double-click for Wallet',
        summary: 'Two quick clicks of the side button bring up your cards.',
        body: [
          'Double-click the side button, or the L key, and Wallet rises with your default card ready. Holding the button instead asks Siri.',
          'An app can ask you to confirm a purchase the same way: double-click when it prompts, and the payment sheet appears.'
        ],
        glyph: 'check'
      }
    ]
  },
  {
    id: 'battery',
    title: 'Battery and Display',
    blurb: 'Get more from a charge and from each display.',
    glyph: 'battery',
    art: appAppearance.tipsYellow,
    tips: [
      {
        id: 'battery-cover',
        title: 'Read on the cover',
        summary: 'Closing the Duo parks the inner display entirely.',
        body: [
          'The inner display is the larger of the two and draws the most power. Closed, it is fully off, so a book, a podcast or a long message thread costs far less on the cover.',
          'Open the Duo only for what needs the room.'
        ],
        glyph: 'battery'
      },
      {
        id: 'half-fold',
        title: 'Stand it half open',
        summary: 'At 90° the Duo is its own tripod.',
        body: [
          'Fold the Duo to a right angle and stand it on a table. Camera puts the viewfinder on the upper half and the controls on the lower, ready for a long exposure or a group shot.',
          'Use the fold slider to hold the exact angle you want.'
        ],
        glyph: 'live'
      },
      {
        id: 'torch',
        title: 'Find the torch',
        summary: 'It lives in Control Center and lights the model itself.',
        body: [
          'Pull down Control Center and tap the torch. The LED on the back of the Duo comes on, and you can see it on the phone from the other side.',
          'Tap again to turn it off.'
        ],
        glyph: 'torchOn'
      }
    ]
  }
]

export const ALL_TIPS = COLLECTIONS.flatMap((c) => c.tips.map((tip) => ({ tip, collection: c })))

/**
 * The tip of the day: the same one on both displays and across a reload, because it
 * is chosen by the date rather than drawn.
 */
export const tipOfTheDay = (now = new Date()) => {
  const start = Date.UTC(now.getFullYear(), 0, 1)
  const day = Math.floor((now.getTime() - start) / 86_400_000)
  return ALL_TIPS[day % ALL_TIPS.length]!
}
