// Health Details: the profile the rings are computed for - name, year of
// birth, sex, blood type, height, weight. Editable in place; the avatar letter
// on Summary follows the name immediately.

import { type Profile, setProfile } from '@doan-labs/duo-fixtures/health.ts'
import { Row, Section, Select, TextField } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { Avatar, PageHead } from './parts.tsx'
import { useBook } from './store.ts'
import { styles } from './styles.ts'

export function ProfilePage({ wide }: { wide: boolean }) {
  const { profile } = useBook()
  const field = (patch: Partial<Profile>) => setProfile(patch)
  return (
    <>
      <PageHead wide={wide} title={<span {...stylex.props(typography.title3)}>Health Details</span>} />
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.pageHead, styles.sheetRow)}>
            <Avatar name={profile.name} size={56} />
            <div>
              <div {...stylex.props(typography.title3)}>{profile.name}</div>
              <div {...stylex.props(shared.sub)}>
                Born {profile.born} · {profile.heightCm} cm · {profile.weightKg} kg
              </div>
            </div>
          </div>
          <Section>
            <Row
              label="Name"
              detail={
                <TextField
                  value={profile.name}
                  onChange={(e) => field({ name: (e.target as HTMLInputElement).value })}
                />
              }
            />
            <Row
              label="Year of Birth"
              detail={
                <TextField
                  type="number"
                  value={profile.born}
                  onChange={(e) => field({ born: Number((e.target as HTMLInputElement).value) || profile.born })}
                />
              }
            />
            <Row
              label="Sex"
              detail={
                <Select
                  value={profile.sex}
                  onChange={(e) => field({ sex: (e.target as HTMLSelectElement).value as Profile['sex'] })}
                >
                  {(['Not Set', 'Female', 'Male', 'Other'] as const).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              }
            />
            <Row
              label="Blood Type"
              detail={
                <Select value={profile.blood} onChange={(e) => field({ blood: (e.target as HTMLSelectElement).value })}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Not Set'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              }
            />
            <Row
              label="Height"
              detail={
                <span {...stylex.props(styles.sheetRow)}>
                  <TextField
                    type="number"
                    value={profile.heightCm}
                    onChange={(e) =>
                      field({ heightCm: Number((e.target as HTMLInputElement).value) || profile.heightCm })
                    }
                  />
                  <span {...stylex.props(shared.sub)}>cm</span>
                </span>
              }
            />
          </Section>
          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>Medical ID</span>
          </div>
          <Section>
            <Row
              label="Conditions"
              detail={
                <TextField
                  value={profile.conditions}
                  onChange={(e) => field({ conditions: (e.target as HTMLInputElement).value })}
                  xstyle={styles.grow}
                />
              }
            />
            <Row
              label="Medications"
              detail={
                <TextField
                  value={profile.meds}
                  onChange={(e) => field({ meds: (e.target as HTMLInputElement).value })}
                  xstyle={styles.grow}
                />
              }
            />
          </Section>
          <p {...stylex.props(shared.sub, styles.date)}>
            The details behind Health’s calculations and the emergency card, stored on this Duo only.
          </p>
        </div>
      </div>
    </>
  )
}
