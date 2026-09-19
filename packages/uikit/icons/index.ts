// Real Apple artwork, taken off this Mac rather than drawn by hand: app icons
// out of /System/Applications and SF Symbols out of AppKit. `bun run icons`
// re-extracts the set. App icons are cropped to Apple's 824/1024 icon grid so
// they fill a tile the way an iOS icon does.
//
// The eight iOS-only apps on Apple's iPhone Duo home screen (developer.apple.com
// /design/human-interface-guidelines/designing-for-iphone-duo) ship no macOS
// counterpart, so those are drawn here on the same superellipse.
//
// wall.webp is Apple's own Star White dune wallpaper, lifted out of the
// iPhone Duo USDZ that tools/prepare-assets.py downloads for the body model.

const appstore = '/icons/appstore.webp'
const books = '/icons/books.webp'
const calculator = '/icons/calculator.webp'
const calendar = '/icons/calendar.webp'
const clock = '/icons/clock.webp'
const contacts = '/icons/contacts.webp'
const facetime = '/icons/facetime.webp'
const findmy = '/icons/findmy.webp'
const freeform = '/icons/freeform.webp'
const home = '/icons/home.webp'
const mail = '/icons/mail.webp'
const maps = '/icons/maps.webp'
const messages = '/icons/messages.webp'
const music = '/icons/music.webp'
const news = '/icons/news.webp'
const notes = '/icons/notes.webp'
const phone = '/icons/phone.webp'
const photos = '/icons/photos.webp'
const podcasts = '/icons/podcasts.webp'
const preview = '/icons/preview.webp'
const reminders = '/icons/reminders.webp'
const safari = '/icons/safari.webp'
const settings = '/icons/settings.webp'
const shortcuts = '/icons/shortcuts.webp'
const siri = '/icons/siri.webp'
const stocks = '/icons/stocks.webp'
const tips = '/icons/tips.webp'
const tv = '/icons/tv.webp'
const voicememos = '/icons/voicememos.webp'
const wall = '/icons/wall.webp'
const weather = '/icons/weather.webp'

/** Apple's Star White dune wallpaper, out of the iPhone Duo USDZ. */
export const WALLPAPER = wall

const airplane = '/icons/sym/airplane.webp'
const antenna = '/icons/sym/antenna-radiowaves-left-and-right.webp'
const reload = '/icons/sym/arrow-clockwise.webp'
const flip = '/icons/sym/arrow-triangle-2-circlepath-camera-fill.webp'
const expand = '/icons/sym/arrow-up-left-and-arrow-down-right.webp'
const undo = '/icons/sym/arrow-uturn-backward.webp'
const aspect = '/icons/sym/aspectratio.webp'
const battery = '/icons/sym/battery-100.webp'
const bolt = '/icons/sym/bolt-fill.webp'
const boltOff = '/icons/sym/bolt-slash-fill.webp'
const book = '/icons/sym/book-fill.webp'
const filters = '/icons/sym/camera-filters.webp'
const cellular = '/icons/sym/cellularbars.webp'
const checklist = '/icons/sym/checklist.webp'
const back = '/icons/sym/chevron-left.webp'
const forward = '/icons/sym/chevron-right.webp'
const up = '/icons/sym/chevron-up.webp'
const bluetooth = '/icons/sym/dot-radiowaves-left-and-right.webp'
const more = '/icons/sym/ellipsis-circle.webp'
const torchOff = '/icons/sym/flashlight-off-fill.webp'
const torchOn = '/icons/sym/flashlight-on-fill.webp'
const newFolder = '/icons/sym/folder-badge-plus.webp'
const folder = '/icons/sym/folder-fill.webp'
const gear = '/icons/sym/gear.webp'
const privacy = '/icons/sym/hand-raised-fill.webp'
const iphone = '/icons/sym/iphone.webp'
const live = '/icons/sym/livephoto.webp'
const location = '/icons/sym/location-fill.webp'
const lock = '/icons/sym/lock-fill.webp'
const search = '/icons/sym/magnifyingglass.webp'
const moon = '/icons/sym/moon-fill.webp'
const note = '/icons/sym/note-text.webp'
const markup = '/icons/sym/pencil-tip-crop-circle.webp'
const people = '/icons/sym/person-2-fill.webp'
const person = '/icons/sym/person-crop-circle.webp'
const plus = '/icons/sym/plus.webp'
const exposure = '/icons/sym/plusminus-circle.webp'
const sidebar = '/icons/sym/sidebar-left.webp'
const moonStars = '/icons/sym/moon-stars-fill.webp'
const cloudSun = '/icons/sym/cloud-sun-fill.webp'
const cloudMoon = '/icons/sym/cloud-moon-fill.webp'
const cloud = '/icons/sym/cloud-fill.webp'
const fog = '/icons/sym/cloud-fog-fill.webp'
const drizzle = '/icons/sym/cloud-drizzle-fill.webp'
const rain = '/icons/sym/cloud-rain-fill.webp'
const heavyRain = '/icons/sym/cloud-heavyrain-fill.webp'
const snow = '/icons/sym/cloud-snow-fill.webp'
const storm = '/icons/sym/cloud-bolt-rain-fill.webp'
const sunRain = '/icons/sym/cloud-sun-rain-fill.webp'
const moonRain = '/icons/sym/cloud-moon-rain-fill.webp'
const sunrise = '/icons/sym/sunrise-fill.webp'
const sunset = '/icons/sym/sunset-fill.webp'
const wind = '/icons/sym/wind.webp'
const thermometer = '/icons/sym/thermometer-medium.webp'
const humidity = '/icons/sym/humidity-fill.webp'
const eye = '/icons/sym/eye-fill.webp'
const gauge = '/icons/sym/gauge-with-dots-needle-33percent.webp'
const sunOutline = '/icons/sym/sun-max.webp'
const drop = '/icons/sym/drop-fill.webp'
const map = '/icons/sym/map-fill.webp'
const list = '/icons/sym/list-bullet.webp'
const aqi = '/icons/sym/aqi-medium.webp'
const umbrella = '/icons/sym/umbrella-fill.webp'
const calendarSym = '/icons/sym/calendar.webp'
const clockSym = '/icons/sym/clock.webp'
const pin = '/icons/sym/mappin.webp'
const walk = '/icons/sym/figure-walk.webp'
const bus = '/icons/sym/bus-fill.webp'
const tram = '/icons/sym/tram-fill.webp'
const fork = '/icons/sym/fork-knife.webp'
const cup = '/icons/sym/cup-and-saucer-fill.webp'
const cart = '/icons/sym/cart-fill.webp'
const cross = '/icons/sym/cross-fill.webp'
const leaf = '/icons/sym/leaf-fill.webp'
const museum = '/icons/sym/building-columns-fill.webp'
const film = '/icons/sym/film-fill.webp'
const star = '/icons/sym/star.webp'
const tick = '/icons/sym/checkmark.webp'
const globe = '/icons/sym/globe-americas-fill.webp'
const volume = '/icons/sym/speaker-wave-3-fill.webp'
const share = '/icons/sym/square-and-arrow-up.webp'
const compose = '/icons/sym/square-and-pencil.webp'
const grid = '/icons/sym/square-grid-3x3.webp'
const tabs = '/icons/sym/square-on-square.webp'
const sun = '/icons/sym/sun-max-fill.webp'
const table = '/icons/sym/tablecells.webp'
const trash = '/icons/sym/trash-fill.webp'
const wifi = '/icons/sym/wifi.webp'
const close = '/icons/sym/xmark.webp'
const library = '/icons/sym/photo-on-rectangle-angled.webp'
const collections = '/icons/sym/square-grid-2x2.webp'
const heart = '/icons/sym/heart.webp'
const heartFill = '/icons/sym/heart-fill.webp'
const saved = '/icons/sym/square-and-arrow-down.webp'
const mapOutline = '/icons/sym/map.webp'
const video = '/icons/sym/video.webp'
const screenshot = '/icons/sym/camera-viewfinder.webp'
const peopleStack = '/icons/sym/person-2-crop-square-stack.webp'
const trashOutline = '/icons/sym/trash.webp'
const albums = '/icons/sym/rectangle-stack.webp'
const photo = '/icons/sym/photo.webp'
const sharedAlbums = '/icons/sym/rectangle-stack-badge-person-crop.webp'
const activity = '/icons/sym/bubble-left-and-bubble-right.webp'
const sharedWithYou = '/icons/sym/shared-with-you.webp'
const handwriting = '/icons/sym/hand-draw.webp'
const illustration = '/icons/sym/paintbrush-pointed.webp'
const document = '/icons/sym/doc-text.webp'
const imports = '/icons/sym/square-and-arrow-down-on-square.webp'
const minus = '/icons/sym/minus.webp'
const filter = '/icons/sym/line-3-horizontal-decrease.webp'
const ellipsis = '/icons/sym/ellipsis.webp'
const info = '/icons/sym/info-circle.webp'
const check = '/icons/sym/checkmark-circle-fill.webp'
const down = '/icons/sym/chevron-down.webp'

/** Apple's icon outline is a superellipse, not a rounded rect. */
function squircle(size: number, n = 5) {
  const r = size / 2
  let d = ''
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = r + Math.sign(c) * Math.abs(c) ** (2 / n) * r
    const y = r + Math.sign(s) * Math.abs(s) ** (2 / n) * r
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d}Z`
}

const SQ = squircle(192)
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">${body}</svg>`)}`

const camera = svg(`<defs>
<linearGradient id="b" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#b2b2b7"/><stop offset="1" stop-color="#4b4b50"/></linearGradient>
<linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfbfd"/><stop offset="1" stop-color="#7d7d82"/></linearGradient>
<radialGradient id="i" cx=".34" cy=".27" r=".95"><stop offset="0" stop-color="#5d6d7a"/><stop offset=".5" stop-color="#1b2025"/><stop offset="1" stop-color="#090b0e"/></radialGradient>
</defs>
<path d="${SQ}" fill="url(#b)"/>
<rect x="54" y="35" width="32" height="12" rx="6" fill="#eaeaec" opacity=".9"/>
<circle cx="96" cy="108" r="47" fill="url(#r)"/>
<circle cx="96" cy="108" r="38" fill="url(#i)"/>
<ellipse cx="79" cy="92" rx="14" ry="9" fill="#fff" opacity=".22" transform="rotate(-32 79 92)"/>`)

const youtube = svg(`<path d="${SQ}" fill="#fff"/>
<rect x="30" y="60" width="132" height="80" rx="26" fill="#f00"/>
<path d="M84 82 122 100 84 118Z" fill="#fff"/>`)

// --- the iOS-only eight, drawn on the same superellipse -------------------
// Each is the Apple mark reduced to what survives at 51 px on the home screen:
// Fitness is three rings, Health a heart, Wallet three stacked cards.

/** Body plus an optional inner shine, the two things every icon below shares. */
const body = (fill: string, extra = '') =>
  `<path d="${SQ}" fill="${fill}"/>
   <path d="${SQ}" fill="url(#sheen)"/>${extra}`
const SHEEN = `<linearGradient id="sheen" x1="0" y1="0" x2=".2" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>`

const ring = (r: number, c: string) =>
  `<circle cx="96" cy="96" r="${r}" fill="none" stroke="${c}" stroke-width="17" stroke-opacity=".28"/>
   <circle cx="96" cy="96" r="${r}" fill="none" stroke="${c}" stroke-width="17" stroke-linecap="round"
     stroke-dasharray="${2 * Math.PI * r}" stroke-dashoffset="${2 * Math.PI * r * 0.14}" transform="rotate(-90 96 96)"/>`

const fitness = svg(`<defs>${SHEEN}</defs>${body('#0b0b0d')}
${ring(63, '#fa114f')}${ring(41, '#a6f425')}${ring(19, '#22e0f5')}`)

const watch = svg(`<defs>${SHEEN}
<linearGradient id="wc" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#f2f2f5"/><stop offset="1" stop-color="#8e8e94"/></linearGradient>
</defs>${body('#0b0b0d')}
<rect x="120" y="72" width="13" height="30" rx="6" fill="url(#wc)"/>
<rect x="47" y="26" width="98" height="140" rx="42" fill="none" stroke="url(#wc)" stroke-width="9"/>
<rect x="56" y="35" width="80" height="122" rx="34" fill="#000"/>`)

const files = svg(`<defs>${SHEEN}
<linearGradient id="fo" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#3fb9ff"/><stop offset="1" stop-color="#0a7cff"/></linearGradient>
</defs>${body('#fdfdff')}
<path d="M34 66a12 12 0 0 1 12-12h30l14 16h56a12 12 0 0 1 12 12v56a12 12 0 0 1-12 12H46a12 12 0 0 1-12-12Z" fill="#59c4ff"/>
<path d="M34 84a12 12 0 0 1 12-12h100a12 12 0 0 1 12 12v54a12 12 0 0 1-12 12H46a12 12 0 0 1-12-12Z" fill="url(#fo)"/>`)

const health = svg(`<defs>${SHEEN}
<linearGradient id="ht" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ff375f"/><stop offset="1" stop-color="#e4053c"/></linearGradient>
</defs>${body('#fdfdff')}
<path d="M96 156C60 130 34 110 34 82a30 30 0 0 1 62-12 30 30 0 0 1 62 12c0 28-26 48-62 74Z" fill="url(#ht)"/>`)

const wallet = svg(`<defs>${SHEEN}
<linearGradient id="w1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd60a"/><stop offset="1" stop-color="#ff9f0a"/></linearGradient>
<linearGradient id="w2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ac8fa"/><stop offset="1" stop-color="#0a84ff"/></linearGradient>
<linearGradient id="w3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6482"/><stop offset="1" stop-color="#ff375f"/></linearGradient>
</defs>${body('#0b0b0d')}
<rect x="34" y="52" width="124" height="46" rx="11" fill="url(#w1)"/>
<rect x="34" y="76" width="124" height="46" rx="11" fill="url(#w3)"/>
<rect x="34" y="100" width="124" height="46" rx="11" fill="url(#w2)"/>
<rect x="34" y="110" width="124" height="10" fill="#f2f2f7" fill-opacity=".92"/>`)

const itunes = svg(`<defs>${SHEEN}
<linearGradient id="it" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#d84bff"/><stop offset="1" stop-color="#9a1ee8"/></linearGradient>
<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#f3d7ff"/></linearGradient>
</defs>${body('url(#it)')}
<path d="M96 30 118 76l50 7-36 35 9 50-45-24-45 24 9-50-36-35 50-7Z" fill="url(#st)"/>`)

/** App icon by display name. */
export const ICONS: Record<string, string> = {
  Phone: phone,
  Safari: safari,
  Messages: messages,
  Music: music,
  FaceTime: facetime,
  Calendar: calendar,
  Photos: photos,
  Camera: camera,
  Mail: mail,
  Notes: notes,
  Reminders: reminders,
  Clock: clock,
  News: news,
  TV: tv,
  Podcasts: podcasts,
  'App Store': appstore,
  Maps: maps,
  Weather: weather,
  Calculator: calculator,
  Settings: settings,
  YouTube: youtube,
  Books: books,
  Stocks: stocks,
  Home: home,
  Freeform: freeform,
  Shortcuts: shortcuts,
  'Find My': findmy,
  'Voice Memos': voicememos,
  Preview: preview,
  Contacts: contacts,
  Tips: tips,
  Siri: siri,
  Fitness: fitness,
  Watch: watch,
  Files: files,
  Health: health,
  Wallet: wallet,
  'iTunes Store': itunes
}

/** SF Symbols, as white glyphs to be recoloured through a CSS mask. */
export const SYM = {
  library,
  collections,
  heart,
  heartFill,
  saved,
  mapOutline,
  video,
  screenshot,
  peopleStack,
  trashOutline,
  albums,
  photo,
  sharedAlbums,
  activity,
  sharedWithYou,
  handwriting,
  illustration,
  document,
  imports,
  minus,
  filter,
  ellipsis,
  info,
  check,
  down,
  cellular,
  wifi,
  battery,
  airplane,
  bluetooth,
  antenna,
  gear,
  sun,
  volume,
  moon,
  iphone,
  privacy,
  lock,
  back,
  forward,
  book,
  share,
  tabs,
  search,
  reload,
  close,
  plus,
  location,
  more,
  person,
  bolt,
  boltOff,
  grid,
  flip,
  aspect,
  filters,
  exposure,
  live,
  up,
  torchOn,
  torchOff,
  folder,
  newFolder,
  trash,
  note,
  people,
  sidebar,
  compose,
  expand,
  undo,
  checklist,
  table,
  markup,
  moonStars,
  cloudSun,
  cloudMoon,
  cloud,
  fog,
  drizzle,
  rain,
  heavyRain,
  snow,
  storm,
  sunRain,
  moonRain,
  sunrise,
  sunset,
  wind,
  thermometer,
  humidity,
  eye,
  gauge,
  sunOutline,
  drop,
  map,
  list,
  aqi,
  umbrella,
  calendarSym,
  clockSym,
  pin,
  walk,
  bus,
  tram,
  fork,
  cup,
  cart,
  cross,
  leaf,
  museum,
  film,
  star,
  tick,
  globe
}

/** The wallpaper rides along under this key: screen.ts needs it decoded too. */
export const WALL_KEY = '@wallpaper'

/** Decodes one image; a URL that fails still resolves, to an element with no width. */
export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((done) => {
    const img = new Image()
    img.onload = img.onerror = () => done(img)
    img.src = src
  })

/** Decoded app icons, for painting the baked display textures, with `wall` under WALL_KEY. */
export function loadIcons(wall = WALLPAPER) {
  const all = { ...ICONS, [WALL_KEY]: wall }
  return Promise.all(Object.entries(all).map(async ([name, src]) => [name, await loadImage(src)] as const)).then(
    (got) => Object.fromEntries(got) as Record<string, HTMLImageElement>
  )
}
