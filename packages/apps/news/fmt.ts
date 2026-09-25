// Small text helpers shared by the feeds and the article page.

/** Strip tags first, then let a textarea decode the entities. No markup survives to be parsed. */
export const detag = (s: string) => {
  const d = document.createElement('textarea')
  d.innerHTML = s.replace(/<[^>]*>/g, ' ')
  return d.value.replace(/\s+/g, ' ').trim()
}

/** An item's text is one <p>-joined blob: split it back into paragraphs. */
export const paras = (s: string) =>
  s
    .split(/<\/?p>/gi)
    .map((p) => detag(p))
    .filter(Boolean)

/** 'just now', '8m', '3h', 'Yesterday', then 'Sep 12' as a story ages. */
export function ago(unix: number) {
  const s = Math.max(0, Date.now() / 1000 - unix)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  if (s < 172800) return 'Yesterday'
  if (s < 604800) return `${Math.round(s / 86400)}d`
  return new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** 'www.theverge.com/articles/x' reads as 'theverge.com', a story without a link as 'news.ycombinator.com'. */
export const host = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : 'news.ycombinator.com'
  } catch {
    return 'news.ycombinator.com'
  }
}

/** The date line beside "Today": 'Friday, September 25'. */
export const today = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
