export function documentPolicy(scriptHash: string, styleHashes: string[], network: readonly string[] = []) {
  return [
    "default-src 'none'",
    `script-src 'sha256-${scriptHash}'`,
    `style-src ${styleHashes.map((hash) => `'sha256-${hash}'`).join(' ')}`,
    'img-src data:',
    'font-src data:',
    ...(network.length ? [`connect-src ${network.join(' ')}`] : []),
    `media-src data: ${network.join(' ')}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "worker-src 'none'"
  ].join('; ')
}
