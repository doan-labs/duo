// Shape of src/generated/api.ts, written by scripts/api.ts from the TSDoc in packages/sdk and packages/uikit.
export type ApiMember = {
  name: string
  type: string
  optional: boolean
  doc: string
  /** Default taken from the component's destructured parameter, when it has one. */
  default?: string
}

export type ApiEntry = {
  pkg: '@doan-labs/duo-sdk' | '@doan-labs/duo-uikit'
  name: string
  kind: 'component' | 'hook' | 'function' | 'class' | 'type' | 'value'
  /** Repository path of the declaration. */
  file: string
  line: number
  /** The TSDoc comment, cleaned of its comment markers; empty when the export has none. */
  doc: string
  /** Declaration text: a function's head, a type alias in full. */
  signature: string
  /** Props of a component, or members of an object type. */
  members?: ApiMember[]
  /** Types a component's props intersect with and that were not expanded, e.g. `PrimitiveProps<'button'>`. */
  extends?: string[]
}
