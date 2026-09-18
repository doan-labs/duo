import { props as originalProps, type StyleXStyles } from '@stylexjs/stylex'

export * from '@stylexjs/stylex'

const classes = new Map<string, string>()
/** The builder aliases StyleX to this adapter only inside isolated documents. */
export function props(...styles: StyleXStyles[]) {
  const result = originalProps(styles)
  if (!result.style) return result
  const declaration = Object.entries(result.style)
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(';')
  let name = classes.get(declaration)
  if (!name) {
    name = `duo-dynamic-${classes.size}`
    const sheet = (document.getElementById('duo-dynamic') as HTMLStyleElement).sheet!
    const rule = sheet.cssRules[sheet.insertRule(`.${name}{}`, sheet.cssRules.length)] as CSSStyleRule
    // setProperty parses each value separately; a value cannot inject another rule.
    for (const [k, v] of Object.entries(result.style)) rule.style.setProperty(k, String(v))
    classes.set(declaration, name)
  }
  return { className: `${result.className ?? ''} ${name}` }
}
