import { Num, Row, Section } from '@doan-labs/ipduo-uikit'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [steps, setSteps] = useState(8412)
  useEffect(() => {
    const t = setInterval(() => setSteps((s) => s + 7), 1500)
    return () => clearInterval(t)
  }, [])
  return (
    <Section>
      <Row label="Steps" detail={<Num value={steps} />} />
      <Row
        label="Distance"
        detail={<Num value={steps * 0.00074} format={{ maximumFractionDigits: 2 }} suffix=" km" />}
      />
      <Row label="Unavailable" detail={<Num value={undefined} />} />
    </Section>
  )
}
