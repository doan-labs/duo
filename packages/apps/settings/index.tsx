import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { ComponentProps } from 'react'
import { styles } from './styles.ts'

const Setting = ({
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
  <Row>
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
      <Toggle aria-label={name} defaultChecked={sw} />
    )}
  </Row>
)

export const Settings = () => (
  <Screen>
    <Title>Settings</Title>
    <Section>
      <Row>
        <span {...stylex.props(shared.rowIc, styles.tint(colors.grey), styles.avatar)}>
          <Sym name="person" size={40} />
        </span>
        <div>
          <div {...stylex.props(styles.name)}>Apple Account</div>
          <Text as="div" size="caption">
            iCloud, Media & Purchases
          </Text>
        </div>
        <span {...stylex.props(shared.rowR)}>›</span>
      </Row>
    </Section>
    <Section>
      <Setting ic="airplane" bg={colors.orange} name="Airplane Mode" right="" sw={false} />
      <Setting ic="wifi" bg={colors.blue} name="Wi‑Fi" right="Duo-5G" />
      <Setting ic="bluetooth" bg={colors.blue} name="Bluetooth" right="On" />
      <Setting ic="antenna" bg={colors.green} name="Cellular" />
    </Section>
    <Section>
      <Setting ic="gear" bg={colors.grey} name="General" right="iOS 27" />
      <Setting ic="sun" bg={colors.blue} name="Display & Brightness" />
      <Setting ic="volume" bg={colors.settingsPink} name="Sounds & Haptics" />
      <Setting ic="moon" bg={colors.settingsIndigo} name="Focus" />
    </Section>
    <Section>
      <Setting ic="iphone" bg={colors.black} name="About" right="iPhone Duo" />
      <Setting ic="battery" bg={colors.green} name="Battery" right="82%" />
      <Setting ic="privacy" bg={colors.blue} name="Privacy & Security" />
      <Setting ic="lock" bg={colors.grey} name="Face ID & Passcode" />
    </Section>
  </Screen>
)

import { Row, Screen, Section, Text, Title, Toggle } from '@doan-labs/ipduo-uikit'
