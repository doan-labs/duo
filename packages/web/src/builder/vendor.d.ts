declare module '@babel/standalone' {
  export const packages: { types: typeof import('@babel/core').types }
  export function transform(
    source: string,
    options: Record<string, unknown>
  ): {
    code: string
    metadata: { stylex?: [string, { ltr: string; rtl?: string | null }, number][] }
  }
}
declare module '@stylexjs/babel-plugin/lib/index.browser.js' {
  const plugin: typeof import('@stylexjs/babel-plugin').default
  export default plugin
}
