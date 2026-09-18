import { createFileRoute } from '@tanstack/react-router'
import { Apps } from '../home/apps'
import { Cta } from '../home/cta'
import { Fold } from '../home/fold'
import { Hero } from '../home/hero'
import { Open } from '../home/open'
import { Sdk } from '../home/sdk'
import { Works } from '../home/works'

// The launch page, in the order the story is told: what is this, it works,
// it uses real hardware, it installs apps, the fold is input, here is the
// SDK, here are the first apps, it is open, go.
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <>
      <Hero />
      <Works />
      <Fold />
      <Sdk />
      <Apps />
      <Open />
      <Cta />
    </>
  )
}
