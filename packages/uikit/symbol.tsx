import type { ComponentProps } from 'react'
import { Sym } from './sym.tsx'

/** Decorative symbol inheriting text colour. Name the enclosing button when it is the only content. */
export type SymbolProps = ComponentProps<typeof Sym>
function KitSymbol(props: SymbolProps) {
  return <Sym {...props} />
}

export { KitSymbol as Symbol }
