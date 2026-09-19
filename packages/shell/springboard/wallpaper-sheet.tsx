// The wallpaper sheet, what a press held on the wallpaper itself brings up:
// Apple's dune, the gradients wallpaper.ts draws, every shot the Camera took
// and a picture off the disk. A tap hangs it on both displays at once; the
// sheet stays up to compare, and a tap outside it puts it away.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import {
  chrome,
  colors,
  easing,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useSyncExternalStore } from 'react'
import { photoRevision, shots, subscribePhotos } from '../runtime/photos.ts'
import { setWallpaper, useWallpaper, WALLPAPERS } from './wallpaper.ts'

/** A picture off the disk, shrunk to fit localStorage: a phone photo as a data URL would not. */
async function pick(file: File) {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    setWallpaper(c.toDataURL('image/jpeg', 0.85))
  } catch {
    // Not a picture this browser decodes: nothing changes.
  }
}

export function WallpaperSheet({ onClose }: { onClose: () => void }) {
  const current = useWallpaper()
  useSyncExternalStore(subscribePhotos, photoRevision)
  // A picture off the disk is in neither list; it still gets its swatch, marked.
  const papers = [...WALLPAPERS, ...shots]
  if (!papers.includes(current)) papers.push(current)
  return (
    <div data-wallpapers {...stylex.props(styles.scrim)} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div {...stylex.props(shared.glass, styles.sheet)}>
        <div {...stylex.props(styles.title)}>Wallpaper</div>
        <div {...stylex.props(styles.strip)}>
          {papers.map((url) => (
            <div
              key={url}
              data-paper
              data-on={url === current || undefined}
              {...stylex.props(styles.swatch, styles.paper(url), url === current && styles.swatchOn)}
              onClick={() => setWallpaper(url)}
            />
          ))}
          <label {...stylex.props(styles.swatch, styles.more)}>
            +
            <input
              type="file"
              accept="image/*"
              {...stylex.props(styles.file)}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void pick(f)
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

const up = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(24px) scale(.96)' } })

const styles = stylex.create({
  // Clear, so the paper being chosen is what you see; over the dock and the search button.
  scrim: { position: 'absolute', inset: 0, zIndex: 5 },
  sheet: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    maxWidth: 440,
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: radius.xxl,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    animationName: up,
    animationDuration: '.34s',
    animationTimingFunction: easing.pop
  },
  title: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    marginBottom: 10,
    textShadow: shadow.text
  },
  // Padding and a matching negative margin: the chosen swatch's ring and scale
  // need room inside the strip's own scroll clip.
  strip: { display: 'flex', gap: 10, overflowX: 'auto', padding: 6, margin: -6 },
  // Portrait, cropped like the cover display, so a swatch shows what the folded phone will.
  swatch: {
    flexShrink: 0,
    width: 56,
    height: 80,
    borderRadius: radius.lg,
    backgroundSize: 'cover',
    backgroundPosition: '22% center',
    cursor: 'pointer',
    boxShadow: shadow.rim,
    // The ring around the chosen paper is a border, not a shadow: no blur, no spread of its own.
    outlineWidth: 2.5,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    transitionProperty: 'transform, outline-color',
    transitionDuration: '.18s'
  },
  paper: (url: string) => ({ backgroundImage: `url("${url}")` }),
  swatchOn: { outlineColor: colors.white, transform: 'scale(1.06)' },
  more: {
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.regular,
    lineHeight: 1,
    backgroundColor: chrome.fill3
  },
  file: { display: 'none' }
})
