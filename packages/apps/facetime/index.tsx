import { Placeholder, Row, Screen, Section, Text, Title } from '@doan-labs/duo-uikit'

// FaceTime. Tapping a contact rings a generated far end; after a beat they
// "answer" and your own webcam sits in the corner, as on a real call.

import { art, beep } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { ICONS } from '@doan-labs/duo-uikit/icons/index.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

/** Phone's contacts, copied: the two apps ring the same people but Phone is its own file. */
const PEOPLE = [
  'Jony',
  'Ada Lovelace',
  'Mum',
  'Kim Minh',
  'Blender Foundation',
  'Alan Turing',
  'Apple Park Reception',
  'Grace Hopper'
]

/** Webcam feed, or a note saying why there isn't one. Camera wants the same fallback. */
const Webcam = ({ facing = 'user' }: { facing?: 'user' | 'environment' }) => {
  const video = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let stream: MediaStream | undefined
    let gone = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing } })
      .then((s) => {
        // Permission can land after the call ended; a stream nobody stops keeps the camera light on.
        if (gone) {
          for (const t of s.getTracks()) t.stop()
          return
        }
        stream = s
        if (video.current) video.current.srcObject = s
      })
      .catch(() => {
        if (!gone) setFailed(true)
      })
    return () => {
      gone = true
      for (const t of stream?.getTracks() ?? []) t.stop()
    }
  }, [facing])
  return (
    <>
      <video ref={video} autoPlay playsInline muted />
      {failed && (
        <Placeholder xstyle={[styles.camMsg]}>
          <img src={ICONS.Camera} alt="" {...stylex.props(shared.phImg)} />
          Camera unavailable. Allow access and reopen.
        </Placeholder>
      )}
    </>
  )
}

const Call = ({ who, onEnd }: { who: string; onEnd: () => void }) => {
  const [joined, setJoined] = useState(false)
  // The far end "answers" after a beat: the placeholder fades and the webcam
  // goes full-bleed with your own feed dropping into the corner.
  useEffect(() => {
    const join = setTimeout(() => {
      setJoined(true)
      beep([660, 880], 0.12, 0.06)
    }, 2600)
    return () => clearTimeout(join)
  }, [])
  return (
    <div {...stylex.props(styles.ft)}>
      <div {...stylex.props(styles.remote, styles.tint(art(who, 34)), joined && styles.remoteJoined)}>
        <div {...stylex.props(styles.av)}>
          <div {...stylex.props(styles.rip)} />
          {who[0]!.toUpperCase()}
        </div>
      </div>
      <div {...stylex.props(styles.label)}>{who}</div>
      <div {...stylex.props(styles.state)}>{joined ? 'FaceTime Video' : 'Connecting…'}</div>
      <div {...stylex.props(styles.pip)}>
        <Webcam />
      </div>
      <div {...stylex.props(styles.ctl)}>
        <button type="button" {...stylex.props(styles.ctlBtn)} onClick={() => beep([500], 0.07)}>
          <Sym name="volume" size={20} />
        </button>
        <button type="button" {...stylex.props(styles.ctlBtn)} onClick={() => beep([400], 0.07)}>
          <Sym name="privacy" size={20} />
        </button>
        <button type="button" {...stylex.props(styles.ctlBtn, styles.hang)} onClick={onEnd}>
          <Sym name="close" size={20} />
        </button>
      </div>
    </div>
  )
}

export const FaceTime = ({ os }: { os: Os }) => {
  const [call, setCall] = useState<string | null>(null)
  // Messages hands a name over, so tapping the video button there rings straight through.
  const who = os.arg
  useEffect(() => {
    if (!who) return
    const raf = requestAnimationFrame(() => setCall(who))
    return () => cancelAnimationFrame(raf)
  }, [who])
  return (
    <Screen xstyle={[styles.flush]}>
      <Screen>
        <Title>
          FaceTime
          <Title as="span" variant="accessory" xstyle={[styles.newBtn]}>
            <Sym name="plus" size={18} />
            New
          </Title>
        </Title>
        <Section>
          {PEOPLE.map((name) => (
            <Row key={name} xstyle={[styles.person]} onClick={() => setCall(name)}>
              <div {...stylex.props(styles.avatar, styles.tint(art(name)))}>{name[0]}</div>
              <div>
                <div {...stylex.props(styles.name)}>{name}</div>
                <Text as="div" size="caption">
                  Video · yesterday
                </Text>
              </div>
              <span {...stylex.props(shared.rowR, styles.blue)}>
                <Sym name="person" size={22} />
              </span>
            </Row>
          ))}
        </Section>
      </Screen>
      <div {...stylex.props(styles.stage)}>{call && <Call who={call} onEnd={() => setCall(null)} />}</div>
    </Screen>
  )
}
