import { createFileRoute } from '@tanstack/react-router'
import { Apps } from '../home/apps'
import { Build } from '../home/build'
import { Camera } from '../home/camera'
import { Cta } from '../home/cta'
import { Fold } from '../home/fold'
import { Hero } from '../home/hero'
import { Open } from '../home/open'
import { Sdk } from '../home/sdk'
import { Store } from '../home/store'
import { Works } from '../home/works'

// The launch page, in the order the story is told: what is this, it works,
// it uses real hardware, it installs apps, the fold is input, you can build
// one, here is the SDK, here are the first apps, it is open, go.
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <>
      <Hero />
      <Works />
      <Camera />
      <Store />
      <Fold />
      <Build />
      <Sdk />
      <Apps />
      <Open />
      <Cta />
    </>
  )
}
