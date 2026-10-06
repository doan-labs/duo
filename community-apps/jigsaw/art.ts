// The three bundled illustrations, hand-drawn SVG markup. Pieces clip a single
// data-URI raster of the art instead of re-rendering the scene 48 times, so the
// markup below is also what the picker's thumbnails and the board guide show.
// Artwork colours are content, like icon.png's; interface chrome stays on
// tokens in styles.ts.
import { BOARD_H, BOARD_W } from './puzzle.ts'

export type ArtId = 'harbour' | 'alpine' | 'lantern'

export const ARTS: { id: ArtId; name: string; blurb: string }[] = [
  { id: 'harbour', name: 'Harbour Dawn', blurb: 'Sunrise over the marina' },
  { id: 'alpine', name: 'Alpine Meadow', blurb: 'Wildflowers below the peaks' },
  { id: 'lantern', name: 'Lantern Night', blurb: 'A festival street after dark' }
]

const harbour = `
<defs>
  <linearGradient id="hg-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(229, 53%, 20%)"/>
    <stop offset=".45" stop-color="hsl(299, 24%, 35%)"/>
    <stop offset=".72" stop-color="hsl(15, 70%, 59%)"/>
    <stop offset="1" stop-color="hsl(33, 88%, 69%)"/>
  </linearGradient>
  <linearGradient id="hg-sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(336, 27%, 43%)"/>
    <stop offset=".4" stop-color="hsl(272, 28%, 29%)"/>
    <stop offset="1" stop-color="hsl(230, 42%, 20%)"/>
  </linearGradient>
</defs>
<rect width="400" height="300" fill="url(#hg-sky)"/>
<circle cx="200" cy="196" r="30" fill="hsl(38, 100%, 81%)"/>
<circle cx="200" cy="196" r="46" fill="hsl(38, 100%, 81%)" opacity=".22"/>
<circle cx="200" cy="196" r="70" fill="hsl(29, 100%, 71%)" opacity=".12"/>
<ellipse cx="90" cy="96" rx="52" ry="7" fill="hsl(346, 38%, 55%)" opacity=".55"/>
<ellipse cx="300" cy="72" rx="44" ry="6" fill="hsl(11, 60%, 63%)" opacity=".5"/>
<ellipse cx="250" cy="120" rx="30" ry="5" fill="hsl(18, 74%, 66%)" opacity=".45"/>
<ellipse cx="120" cy="140" rx="38" ry="5" fill="hsl(309, 24%, 38%)" opacity=".6"/>
<path d="M0 196 Q60 178 120 190 T400 188 V206 H0 Z" fill="hsl(267, 30%, 24%)"/>
<path d="M240 196 Q310 182 400 192 V206 H240 Z" fill="hsl(264, 33%, 20%)"/>
<rect y="204" width="400" height="96" fill="url(#hg-sea)"/>
<rect x="196" y="206" width="9" height="86" rx="4" fill="hsl(33, 88%, 69%)" opacity=".5"/>
<rect x="184" y="214" width="34" height="3" rx="1.5" fill="hsl(38, 100%, 81%)" opacity=".7"/>
<rect x="178" y="228" width="46" height="3" rx="1.5" fill="hsl(29, 100%, 71%)" opacity=".5"/>
<rect x="188" y="244" width="28" height="2.4" rx="1.2" fill="hsl(38, 100%, 81%)" opacity=".4"/>
<rect x="30" y="220" width="60" height="2.4" rx="1.2" fill="hsl(0, 39%, 63%)" opacity=".4"/>
<rect x="300" y="238" width="70" height="2.4" rx="1.2" fill="hsl(0, 39%, 63%)" opacity=".35"/>
<rect x="48" y="252" width="44" height="2" rx="1" fill="hsl(277, 18%, 43%)" opacity=".5"/>
<g fill="hsl(257, 40%, 13%)">
  <path d="M286 222 l4 -3 v18 l-4 -1 Z"/>
  <path d="M290 206 l0 16 h-18 Z" fill="hsl(30, 52%, 88%)" opacity=".92"/>
  <path d="M292 210 l0 12 h12 Z" fill="hsl(26, 43%, 74%)"/>
  <path d="M264 223 q20 8 42 0 l-3 6 q-18 7 -36 0 Z"/>
</g>
<g stroke="hsl(257, 40%, 13%)" stroke-width="2" fill="none" stroke-linecap="round">
  <path d="M120 128 q5 -5 10 0 M130 124 q5 -5 10 0"/>
  <path d="M150 110 q4 -4 8 0"/>
</g>
<g fill="hsl(255, 34%, 10%)">
  <rect x="6" y="216" width="10" height="84" rx="2"/>
  <rect x="22" y="226" width="8" height="74" rx="2"/>
  <rect x="0" y="230" width="44" height="8" rx="3"/>
  <rect x="370" y="212" width="9" height="88" rx="2"/>
</g>
`

const alpine = `
<defs>
  <linearGradient id="ag-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(211, 67%, 63%)"/>
    <stop offset=".6" stop-color="hsl(204, 73%, 80%)"/>
    <stop offset="1" stop-color="hsl(120, 38%, 92%)"/>
  </linearGradient>
  <linearGradient id="ag-peak" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(211, 40%, 73%)"/>
    <stop offset="1" stop-color="hsl(214, 25%, 50%)"/>
  </linearGradient>
</defs>
<rect width="400" height="300" fill="url(#ag-sky)"/>
<circle cx="66" cy="52" r="22" fill="hsl(47, 100%, 92%)"/>
<circle cx="66" cy="52" r="34" fill="hsl(47, 100%, 92%)" opacity=".3"/>
<g fill="hsl(0, 0%, 100%)" opacity=".92">
  <ellipse cx="150" cy="60" rx="34" ry="11"/>
  <ellipse cx="176" cy="52" rx="24" ry="9"/>
  <ellipse cx="310" cy="46" rx="40" ry="12"/>
  <ellipse cx="286" cy="38" rx="22" ry="8"/>
  <ellipse cx="40" cy="96" rx="26" ry="8" opacity=".8"/>
</g>
<path d="M60 176 L150 84 L196 140 L252 70 L360 176 Z" fill="url(#ag-peak)"/>
<path d="M150 84 L168 106 L158 112 L146 102 L132 116 L120 108 Z" fill="hsl(213, 100%, 98%)"/>
<path d="M252 70 L272 96 L258 104 L246 92 L232 106 L222 96 Z" fill="hsl(213, 100%, 98%)"/>
<path d="M0 184 Q80 160 160 178 T400 170 V300 H0 Z" fill="hsl(128, 28%, 48%)"/>
<path d="M0 214 Q120 190 220 208 T400 200 V300 H0 Z" fill="hsl(134, 37%, 39%)"/>
<path d="M0 250 Q140 224 260 244 T400 236 V300 H0 Z" fill="hsl(139, 40%, 31%)"/>
<path d="M196 300 Q180 268 208 246 Q226 232 214 214 Q204 200 220 190" stroke="hsl(38, 45%, 73%)" stroke-width="10" fill="none" stroke-linecap="round" opacity=".95"/>
<path d="M60 300 Q96 274 132 260 Q160 248 158 236" stroke="hsl(201, 72%, 70%)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".85"/>
<g fill="hsl(144, 41%, 21%)">
  <path d="M316 220 l14 -34 14 34 Z"/>
  <path d="M318 206 l12 -28 12 28 Z"/>
  <path d="M40 226 l11 -26 11 26 Z"/>
  <path d="M42 214 l9 -22 9 22 Z"/>
  <path d="M270 252 l12 -30 12 30 Z"/>
  <path d="M272 238 l10 -24 10 24 Z"/>
</g>
<g>
  <circle cx="96" cy="262" r="4.5" fill="hsl(0, 0%, 100%)"/><circle cx="96" cy="262" r="1.6" fill="hsl(45, 79%, 58%)"/>
  <circle cx="120" cy="278" r="4.5" fill="hsl(342, 73%, 80%)"/><circle cx="120" cy="278" r="1.6" fill="hsl(0, 0%, 100%)"/>
  <circle cx="150" cy="268" r="4" fill="hsl(45, 79%, 58%)"/><circle cx="150" cy="268" r="1.4" fill="hsl(33, 63%, 33%)"/>
  <circle cx="250" cy="272" r="4.5" fill="hsl(0, 0%, 100%)"/><circle cx="250" cy="272" r="1.6" fill="hsl(45, 79%, 58%)"/>
  <circle cx="286" cy="284" r="4.5" fill="hsl(342, 73%, 80%)"/><circle cx="286" cy="284" r="1.6" fill="hsl(0, 0%, 100%)"/>
  <circle cx="330" cy="262" r="4" fill="hsl(0, 0%, 100%)"/><circle cx="330" cy="262" r="1.4" fill="hsl(45, 79%, 58%)"/>
  <circle cx="60" cy="282" r="4" fill="hsl(342, 73%, 80%)"/><circle cx="60" cy="282" r="1.4" fill="hsl(0, 0%, 100%)"/>
  <circle cx="360" cy="284" r="4" fill="hsl(45, 79%, 58%)"/><circle cx="360" cy="284" r="1.4" fill="hsl(33, 63%, 33%)"/>
</g>
`

const lantern = `
<defs>
  <linearGradient id="lg-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(229, 63%, 7%)"/>
    <stop offset=".55" stop-color="hsl(225, 56%, 19%)"/>
    <stop offset="1" stop-color="hsl(221, 43%, 26%)"/>
  </linearGradient>
  <linearGradient id="lg-street" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(225, 54%, 14%)"/>
    <stop offset="1" stop-color="hsl(232, 53%, 6%)"/>
  </linearGradient>
</defs>
<rect width="400" height="300" fill="url(#lg-sky)"/>
<g fill="hsl(0, 0%, 100%)">
  <circle cx="40" cy="30" r="1.4"/><circle cx="90" cy="18" r="1"/><circle cx="150" cy="40" r="1.6"/>
  <circle cx="210" cy="22" r="1.1"/><circle cx="260" cy="44" r="1.4"/><circle cx="330" cy="26" r="1.7"/>
  <circle cx="376" cy="52" r="1.2"/><circle cx="60" cy="66" r="1.1"/><circle cx="120" cy="84" r="1.3"/>
  <circle cx="300" cy="70" r="1"/><circle cx="356" cy="90" r="1.2"/><circle cx="26" cy="100" r="1"/>
</g>
<circle cx="322" cy="66" r="24" fill="hsl(46, 50%, 90%)"/>
<circle cx="310" cy="60" r="20" fill="hsl(226, 62%, 14%)"/>
<circle cx="322" cy="66" r="30" fill="hsl(46, 50%, 90%)" opacity=".14"/>
<g fill="hsl(226, 54%, 11%)">
  <rect x="8" y="120" width="34" height="96"/>
  <rect x="46" y="96" width="42" height="120"/>
  <rect x="92" y="130" width="30" height="86"/>
  <rect x="126" y="84" width="46" height="132"/>
  <rect x="176" y="116" width="34" height="100"/>
  <rect x="214" y="140" width="28" height="76"/>
  <rect x="246" y="104" width="44" height="112"/>
  <rect x="294" y="128" width="34" height="88"/>
  <rect x="332" y="96" width="40" height="120"/>
  <rect x="374" y="124" width="26" height="92"/>
</g>
<g fill="hsl(39, 100%, 77%)">
  <rect x="52" y="106" width="6" height="8"/><rect x="64" y="106" width="6" height="8"/><rect x="76" y="120" width="6" height="8"/>
  <rect x="52" y="134" width="6" height="8"/><rect x="70" y="148" width="6" height="8"/><rect x="52" y="162" width="6" height="8"/>
  <rect x="132" y="94" width="6" height="8"/><rect x="146" y="94" width="6" height="8"/><rect x="160" y="108" width="6" height="8"/>
  <rect x="132" y="122" width="6" height="8"/><rect x="153" y="136" width="6" height="8"/><rect x="132" y="150" width="6" height="8"/>
  <rect x="252" y="114" width="6" height="8"/><rect x="266" y="114" width="6" height="8"/><rect x="280" y="128" width="6" height="8"/>
  <rect x="252" y="142" width="6" height="8"/><rect x="266" y="156" width="6" height="8"/><rect x="252" y="170" width="6" height="8"/>
  <rect x="340" y="106" width="6" height="8"/><rect x="354" y="120" width="6" height="8"/><rect x="340" y="148" width="6" height="8"/>
  <rect x="182" y="126" width="6" height="8"/><rect x="196" y="140" width="6" height="8"/><rect x="182" y="168" width="6" height="8"/>
</g>
<g fill="hsl(203, 100%, 80%)">
  <rect x="100" y="140" width="6" height="8"/><rect x="112" y="154" width="6" height="8"/>
  <rect x="220" y="150" width="6" height="8"/><rect x="232" y="164" width="6" height="8"/>
  <rect x="300" y="140" width="6" height="8"/><rect x="314" y="154" width="6" height="8"/>
  <rect x="16" y="130" width="6" height="8"/><rect x="28" y="144" width="6" height="8"/>
</g>
<rect y="216" width="400" height="84" fill="url(#lg-street)"/>
<path d="M0 148 Q200 128 400 146" stroke="hsl(226, 42%, 18%)" stroke-width="1.6" fill="none"/>
<g>
  <circle cx="46" cy="144" r="7" fill="hsl(4, 100%, 64%)"/><circle cx="46" cy="144" r="11" fill="hsl(4, 100%, 64%)" opacity=".22"/>
  <circle cx="120" cy="137" r="7" fill="hsl(33, 100%, 62%)"/><circle cx="120" cy="137" r="11" fill="hsl(33, 100%, 62%)" opacity=".22"/>
  <circle cx="196" cy="134" r="7" fill="hsl(4, 100%, 64%)"/><circle cx="196" cy="134" r="11" fill="hsl(4, 100%, 64%)" opacity=".22"/>
  <circle cx="272" cy="136" r="7" fill="hsl(331, 100%, 68%)"/><circle cx="272" cy="136" r="11" fill="hsl(331, 100%, 68%)" opacity=".22"/>
  <circle cx="348" cy="142" r="7" fill="hsl(33, 100%, 62%)"/><circle cx="348" cy="142" r="11" fill="hsl(33, 100%, 62%)" opacity=".22"/>
</g>
<g opacity=".5">
  <rect x="42" y="220" width="8" height="56" fill="hsl(4, 100%, 64%)" opacity=".4"/>
  <rect x="116" y="222" width="8" height="52" fill="hsl(33, 100%, 62%)" opacity=".4"/>
  <rect x="192" y="220" width="8" height="58" fill="hsl(4, 100%, 64%)" opacity=".4"/>
  <rect x="268" y="222" width="8" height="50" fill="hsl(331, 100%, 68%)" opacity=".4"/>
  <rect x="344" y="220" width="8" height="58" fill="hsl(33, 100%, 62%)" opacity=".4"/>
  <rect x="130" y="222" width="10" height="46" fill="hsl(39, 100%, 77%)" opacity=".25"/>
  <rect x="252" y="222" width="10" height="44" fill="hsl(39, 100%, 77%)" opacity=".25"/>
</g>
<g fill="hsl(228, 57%, 9%)">
  <ellipse cx="90" cy="236" rx="46" ry="8"/>
  <path d="M60 230 q30 -18 60 0 Z"/>
  <ellipse cx="300" cy="246" rx="52" ry="9"/>
  <path d="M268 240 q32 -20 64 0 Z"/>
</g>
`

const SCENES: Record<ArtId, string> = { harbour, alpine, lantern }

/** The full standalone SVG document for a scene. */
export function artMarkup(id: ArtId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD_W} ${BOARD_H}">${SCENES[id]}</svg>`
}

const uriCache = new Map<ArtId, string>()
/** Data URI of the scene document: piece fills, thumbnails and the guide. */
export function artUri(id: ArtId): string {
  let uri = uriCache.get(id)
  if (!uri) {
    uri = `data:image/svg+xml,${encodeURIComponent(artMarkup(id))}`
    uriCache.set(id, uri)
  }
  return uri
}

export const isArtId = (v: unknown): v is ArtId => typeof v === 'string' && v in SCENES
