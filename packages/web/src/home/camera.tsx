// The hardware bridge, in the near-black palette: the real Camera app running
// in the frame, asking for your real camera.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { Simulator } from '../simulator'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Columns, Headline, Lede, Reveal, Statement } from './parts'

const MID = '@media (max-width: 1068px)'

export function Camera() {
  const ref = useRef<HTMLDivElement>(null)
  const [asked, setAsked] = useState(false)

  // The browser asks for the camera when the scene is on screen, not when the
  // frame loads a screen early: the page asks once, drops the stream, and only
  // then mounts the frame, whose Camera app finds the permission already given.
  useEffect(() => {
    if (asked || !ref.current) return
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return
        io.disconnect()
        Promise.resolve(navigator.mediaDevices?.getUserMedia({ video: true }))
          .then((s) => s?.getTracks().forEach((t) => t.stop()))
          .catch(() => {})
          .finally(() => setAsked(true))
      },
      { threshold: 0.4 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [asked])

  return (
    <Block cinema labelledBy="camera-title">
      <Columns>
        <div ref={ref}>
          <Cap>02 · Real hardware</Cap>
          <Headline id="camera-title" lines={['Your imaginary phone', 'can use your real camera.']} />
          <Lede>
            Duo runs as a native desktop app. On macOS it can use your Mac camera, or your iPhone through Continuity
            Camera. Point it at the screen and the phone films itself, forever.
          </Lede>
          <p {...stylex.props(styles.annotation)}>
            Host: Tauri 2, any platform with a webcam. In this browser: the same app, over getUserMedia. Your browser
            will ask first.
          </p>
        </div>
        <Reveal>
          <Simulator deg={180} app="Camera" mount={asked} />
        </Reveal>
      </Columns>
      <div {...stylex.props(styles.statement)}>
        <Reveal>
          <Statement lines={['The apps are fake.', 'The capabilities aren’t.']} />
        </Reveal>
      </div>
    </Block>
  )
}

const styles = stylex.create({
  annotation: {
    marginTop: '40px',
    marginBottom: 0,
    maxWidth: '44ch',
    fontFamily: font.mono,
    fontSize: '12.5px',
    lineHeight: 1.6,
    color: color.text3
  },
  statement: { marginTop: { default: '140px', [MID]: '88px' }, maxWidth: '720px' }
})
