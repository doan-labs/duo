import * as stylex from '@stylexjs/stylex'
import { useParams } from '@tanstack/react-router'
import { AppGrid } from '../app-grid'

/** The changelog's app icons, placed in a post. */
export function Apps({ names }: { names: readonly string[] }) {
  // The post's slug rides along, so the app's sheet can lead back here.
  const { slug } = useParams({ strict: false })
  return (
    <div {...stylex.props(styles.box)}>
      <AppGrid names={names} from={slug} />
    </div>
  )
}

const styles = stylex.create({ box: { marginTop: '8px', marginBottom: '32px' } })
