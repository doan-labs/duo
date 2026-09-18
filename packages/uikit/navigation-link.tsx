import { type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { Button, type ButtonProps } from './button.tsx'
import { Page, useNav } from './nav.tsx'

/** Keyboard-accessible push navigation. The destination renders inside a page with a back button. */
export type NavigationLinkProps = Omit<ButtonProps, 'onClick' | 'ref'> & { title: string; destination: ReactNode }
export function NavigationLink({ title, destination, ...props }: NavigationLinkProps) {
  const nav = useNav()
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <Button
      {...props}
      ref={trigger}
      onClick={() =>
        nav.push((back) => (
          <Destination title={title} back={back} trigger={trigger}>
            {destination}
          </Destination>
        ))
      }
    />
  )
}

function Destination({
  title,
  back,
  trigger,
  children
}: {
  title: string
  back: () => void
  trigger: RefObject<HTMLButtonElement | null>
  children: ReactNode
}) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
    return () => {
      if (trigger.current?.isConnected) trigger.current.focus()
    }
  }, [trigger])
  return (
    <Page title={title} back={back} backRef={button}>
      {children}
    </Page>
  )
}
