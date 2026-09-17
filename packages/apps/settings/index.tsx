import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { ComponentProps } from 'react'
import { styles } from './styles.ts'

const Row = ({
  ic,
  bg,
  name,
  right,
  sw
}: {
  ic: ComponentProps<typeof Sym>['name']
  bg: string
  name: string
  right?: string
  sw?: boolean
}) => (
  <div {...stylex.props(shared.row)}>
    <span {...stylex.props(shared.rowIc, styles.tint(bg))}>
      <Sym name={ic} size={18} />
    </span>
    {name}
    {sw === undefined ? (
      <span {...stylex.props(shared.rowR)}>
        {right ?? ''}
        {' ›'}
      </span>
    ) : (
      <input type="checkbox" defaultChecked={sw} {...stylex.props(shared.sw)} />
    )}
  </div>
)

export const Settings = () => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hdr)}>Settings</div>
    <div {...stylex.props(shared.grp)}>
      <div {...stylex.props(shared.row)}>
        <span {...stylex.props(shared.rowIc, styles.tint(colors.grey), styles.avatar)}>
          <Sym name="person" size={40} />
        </span>
        <div>
          <div {...stylex.props(styles.name)}>Apple Account</div>
          <div {...stylex.props(shared.sub)}>iCloud, Media & Purchases</div>
        </div>
        <span {...stylex.props(shared.rowR)}>›</span>
      </div>
    </div>
    <div {...stylex.props(shared.grp)}>
      <Row ic="airplane" bg={colors.orange} name="Airplane Mode" right="" sw={false} />
      <Row ic="wifi" bg={colors.blue} name="Wi‑Fi" right="Duo-5G" />
      <Row ic="bluetooth" bg={colors.blue} name="Bluetooth" right="On" />
      <Row ic="antenna" bg={colors.green} name="Cellular" />
    </div>
    <div {...stylex.props(shared.grp)}>
      <Row ic="gear" bg={colors.grey} name="General" right="iOS 27" />
      <Row ic="sun" bg={colors.blue} name="Display & Brightness" />
      <Row ic="volume" bg="#ff2d55" name="Sounds & Haptics" />
      <Row ic="moon" bg="#5856d6" name="Focus" />
    </div>
    <div {...stylex.props(shared.grp)}>
      <Row ic="iphone" bg={colors.black} name="About" right="iPhone Duo" />
      <Row ic="battery" bg={colors.green} name="Battery" right="82%" />
      <Row ic="privacy" bg={colors.blue} name="Privacy & Security" />
      <Row ic="lock" bg={colors.grey} name="Face ID & Passcode" />
    </div>
  </div>
)
