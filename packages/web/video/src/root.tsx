import { loadFont } from '@remotion/fonts'
import { Composition } from 'remotion'
import { HERO_FRAMES, Hero } from './hero'

// Inter Tight, straight from Google's CDN: the site loads the same family.
const GOOGLE = 'https://fonts.gstatic.com/s/intertight/v9'
loadFont({ family: 'Inter Tight', url: `${GOOGLE}/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjDw-qXA.ttf`, weight: '400' })
loadFont({ family: 'Inter Tight', url: `${GOOGLE}/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj0QiqXA.ttf`, weight: '600' })

export const Root: React.FC = () => (
  <Composition id="Hero" component={Hero} durationInFrames={HERO_FRAMES} fps={30} width={1600} height={900} />
)
