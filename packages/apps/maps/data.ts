// Real OpenStreetMap raster tiles under invented Apple Maps furniture. The
// places sit where they really are — District 1 and 3 of Ho Chi Minh City,
// where the map opens, then San Francisco and a few cities further out for
// search and recents to travel to. Nothing here routes or geocodes, and the
// walking times are invented.

export type Category =
  | 'transit'
  | 'rail'
  | 'medical'
  | 'food'
  | 'cafe'
  | 'shop'
  | 'park'
  | 'museum'
  | 'cinema'
  | 'landmark'
  | 'address'

export type Place = {
  id: string
  name: string
  /** The line under the title on the card, as Apple labels a place's category. */
  kind: string
  category: Category
  lat: number
  lon: number
  address: string[]
  phone?: string
  site?: string
  /** Minutes on foot from the blue dot: the number on the card's blue button. */
  walk: number
}

export type View = { lat: number; lon: number; z: number }

/** Where the blue dot sits, and what the map opens on. */
export const ME = { lat: 10.7846, lon: 106.6866 }
export const HOME: View = { lat: 10.78, lon: 106.693, z: 15 }

/** Under this zoom the map is too busy for every pin to carry its name. */
export const MIN_LABEL_Z = 15

/** The glyph in a pin and in a list row, per category. */
export const GLYPH = {
  transit: 'bus',
  rail: 'tram',
  medical: 'cross',
  food: 'fork',
  cafe: 'cup',
  shop: 'cart',
  park: 'leaf',
  museum: 'museum',
  cinema: 'film',
  landmark: 'pin',
  address: 'pin'
} as const satisfies Record<Category, string>

export const PLACES: Place[] = [
  {
    id: 'eye-stop',
    name: 'Bệnh Viện Mắt TPHCM',
    kind: 'Bus Terminal',
    category: 'transit',
    lat: 10.7818,
    lon: 106.6836,
    address: ['289B Dien Bien Phu', 'Xuan Hoa', 'Ho Chi Minh City', 'Vietnam'],
    walk: 4
  },
  {
    id: 'clinic',
    name: 'Phòng Khám Đa Khoa Sài Gòn',
    kind: 'Medical Clinic',
    category: 'medical',
    lat: 10.7826,
    lon: 106.6828,
    address: ['269 Dien Bien Phu', 'Xuan Hoa', 'Ho Chi Minh City', 'Vietnam'],
    phone: '+84 28 3930 1010',
    walk: 6
  },
  {
    id: 'alley',
    name: 'Alley 382/15 Nguyễn Đình Chiểu',
    kind: 'Address',
    category: 'address',
    lat: 10.7844,
    lon: 106.6852,
    address: ['382/15 Nguyen Dinh Chieu', 'Ward 4, District 3', 'Ho Chi Minh City', 'Vietnam'],
    walk: 2
  },
  {
    id: 'tan-dinh',
    name: 'Tan Dinh Market',
    kind: 'Market',
    category: 'shop',
    lat: 10.791,
    lon: 106.6898,
    address: ['336 Hai Ba Trung', 'Tan Dinh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    site: 'chotandinh.com',
    walk: 23
  },
  {
    id: 'popeyes',
    name: 'Popeyes',
    kind: 'Fried Chicken',
    category: 'food',
    lat: 10.7934,
    lon: 106.6906,
    address: ['2 Tran Quang Khai', 'Tan Dinh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 28
  },
  {
    id: 'le-van-tam',
    name: 'Le Van Tam Park',
    kind: 'Park',
    category: 'park',
    lat: 10.7888,
    lon: 106.6942,
    address: ['Vo Thi Sau', 'Ward 6, District 3', 'Ho Chi Minh City', 'Vietnam'],
    walk: 14
  },
  {
    id: 'pho-hoa',
    name: 'Phở Hòa Pasteur',
    kind: 'Vietnamese Restaurant',
    category: 'food',
    lat: 10.7885,
    lon: 106.6885,
    address: ['260C Pasteur', 'Ward 8, District 3', 'Ho Chi Minh City', 'Vietnam'],
    phone: '+84 28 3829 7943',
    walk: 11
  },
  {
    id: 'gem',
    name: 'GEM Center',
    kind: 'Event Venue',
    category: 'landmark',
    lat: 10.7878,
    lon: 106.7017,
    address: ['8 Nguyen Binh Khiem', 'Da Kao, District 1', 'Ho Chi Minh City', 'Vietnam'],
    site: 'gemcenter.com.vn',
    walk: 26
  },
  {
    id: 'nhi-dong',
    name: 'Pediatrics Hospital 2',
    kind: 'Hospital',
    category: 'medical',
    lat: 10.7855,
    lon: 106.702,
    address: ['14 Ly Tu Trong', 'Ben Nghe, District 1', 'Ho Chi Minh City', 'Vietnam'],
    phone: '+84 28 3829 5723',
    walk: 27
  },
  {
    id: 'turtle-lake',
    name: 'Hồ Con Rùa',
    kind: 'Historic Landmark',
    category: 'landmark',
    lat: 10.7825,
    lon: 106.696,
    address: ['Cong Truong Quoc Te', 'Ward 6, District 3', 'Ho Chi Minh City', 'Vietnam'],
    walk: 17
  },
  {
    id: 'book-street',
    name: 'Book Street',
    kind: 'Bookshop',
    category: 'shop',
    lat: 10.7797,
    lon: 106.6985,
    address: ['Nguyen Van Binh', 'Ben Nghe, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 24
  },
  {
    id: 'playground',
    name: 'The New Playground',
    kind: 'Shopping Centre',
    category: 'shop',
    lat: 10.779,
    lon: 106.7003,
    address: ['26 Ly Tu Trong', 'Ben Nghe, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 26
  },
  {
    id: 'cong',
    name: 'Cộng Cà Phê',
    kind: 'Coffee Shop',
    category: 'cafe',
    lat: 10.7762,
    lon: 106.6938,
    address: ['26 Ly Tu Trong', 'Ben Nghe, District 1', 'Ho Chi Minh City', 'Vietnam'],
    site: 'congcaphe.com',
    walk: 19
  },
  {
    id: 'independence',
    name: 'Independence Palace',
    kind: 'Historic Landmark',
    category: 'museum',
    lat: 10.7772,
    lon: 106.6955,
    address: ['135 Nam Ky Khoi Nghia', 'Ben Thanh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    site: 'dinhdoclap.gov.vn',
    walk: 21
  },
  {
    id: 'opera',
    name: 'Ho Chi Minh City Opera House',
    kind: 'Concert Hall',
    category: 'museum',
    lat: 10.7767,
    lon: 106.703,
    address: ['7 Cong Truong Lam Son', 'Ben Nghe, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 29
  },
  {
    id: 'tao-dan',
    name: 'Tao Dan Park',
    kind: 'Park',
    category: 'park',
    lat: 10.7745,
    lon: 106.6913,
    address: ['Truong Dinh', 'Ben Thanh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 20
  },
  {
    id: 'galaxy',
    name: 'Galaxy Cinema',
    kind: 'Cinema',
    category: 'cinema',
    lat: 10.7745,
    lon: 106.6945,
    address: ['116 Nguyen Du', 'Ben Thanh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    site: 'galaxycine.vn',
    walk: 22
  },
  {
    id: 'ben-thanh',
    name: 'Ben Thanh Market',
    kind: 'Market',
    category: 'shop',
    lat: 10.7724,
    lon: 106.698,
    address: ['Le Loi', 'Ben Thanh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 31
  },
  {
    id: 'banh-mi',
    name: 'Bánh Mì Huỳnh Hoa',
    kind: 'Sandwich Shop',
    category: 'food',
    lat: 10.7692,
    lon: 106.692,
    address: ['26 Le Thi Rieng', 'Ben Thanh, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 34
  },
  {
    id: 'tu-du',
    name: 'Tu Du Hospital',
    kind: 'Hospital',
    category: 'medical',
    lat: 10.769,
    lon: 106.6875,
    address: ['284 Cong Quynh', 'Pham Ngu Lao, District 1', 'Ho Chi Minh City', 'Vietnam'],
    phone: '+84 28 5404 2829',
    walk: 33
  },
  {
    id: 'bui-vien',
    name: 'Bui Vien Walking Street',
    kind: 'Nightlife',
    category: 'landmark',
    lat: 10.767,
    lon: 106.693,
    address: ['Bui Vien', 'Pham Ngu Lao, District 1', 'Ho Chi Minh City', 'Vietnam'],
    walk: 36
  },
  {
    id: 'saigon-station',
    name: 'Saigon Railway Station',
    kind: 'Train Station',
    category: 'rail',
    lat: 10.7822,
    lon: 106.6775,
    address: ['1 Nguyen Thong', 'Ward 9, District 3', 'Ho Chi Minh City', 'Vietnam'],
    site: 'dsvn.vn',
    walk: 15
  },

  // Somewhere to travel to: search or a recent jumps the map out of Saigon.
  {
    id: 'ferry',
    name: 'Ferry Building Marketplace',
    kind: 'Shopping Centre',
    category: 'shop',
    lat: 37.7955,
    lon: -122.3937,
    address: ['1 Ferry Building', 'Embarcadero', 'San Francisco, CA 94111', 'United States'],
    site: 'ferrybuildingmarketplace.com',
    walk: 12
  },
  {
    id: 'blue-bottle',
    name: 'Blue Bottle Coffee',
    kind: 'Coffee Shop',
    category: 'cafe',
    lat: 37.7763,
    lon: -122.4232,
    address: ['315 Linden St', 'Hayes Valley', 'San Francisco, CA 94102', 'United States'],
    site: 'bluebottlecoffee.com',
    walk: 4
  },
  {
    id: 'tartine',
    name: 'Tartine Bakery',
    kind: 'Bakery',
    category: 'food',
    lat: 37.7614,
    lon: -122.4241,
    address: ['600 Guerrero St', 'Mission District', 'San Francisco, CA 94110', 'United States'],
    phone: '+1 (415) 487-2600',
    walk: 7
  },
  {
    id: 'dolores',
    name: 'Mission Dolores Park',
    kind: 'Park',
    category: 'park',
    lat: 37.7596,
    lon: -122.4269,
    address: ['Dolores St & 19th St', 'Mission District', 'San Francisco, CA 94114', 'United States'],
    walk: 9
  },
  {
    id: 'sfmoma',
    name: 'SFMOMA',
    kind: 'Art Museum',
    category: 'museum',
    lat: 37.7857,
    lon: -122.4011,
    address: ['151 3rd St', 'South of Market', 'San Francisco, CA 94103', 'United States'],
    site: 'sfmoma.org',
    walk: 15
  },
  {
    id: 'powell',
    name: 'Powell Street Station',
    kind: 'Metro Station',
    category: 'rail',
    lat: 37.7844,
    lon: -122.4079,
    address: ['899 Market St', 'Union Square', 'San Francisco, CA 94102', 'United States'],
    walk: 6
  },
  {
    id: 'coit',
    name: 'Coit Tower',
    kind: 'Historic Landmark',
    category: 'landmark',
    lat: 37.8024,
    lon: -122.4058,
    address: ['1 Telegraph Hill Blvd', 'Telegraph Hill', 'San Francisco, CA 94133', 'United States'],
    walk: 26
  },
  {
    id: 'castro',
    name: 'Castro Theatre',
    kind: 'Movie Theater',
    category: 'cinema',
    lat: 37.762,
    lon: -122.4348,
    address: ['429 Castro St', 'Castro District', 'San Francisco, CA 94114', 'United States'],
    site: 'castrotheatre.com',
    walk: 11
  },
  {
    id: 'ucsf',
    name: 'UCSF Medical Center',
    kind: 'Hospital',
    category: 'medical',
    lat: 37.7632,
    lon: -122.458,
    address: ['505 Parnassus Ave', 'Inner Sunset', 'San Francisco, CA 94143', 'United States'],
    phone: '+1 (415) 476-1000',
    walk: 18
  },
  {
    id: 'valencia',
    name: '1290 Valencia St',
    kind: 'Address',
    category: 'address',
    lat: 37.7515,
    lon: -122.4207,
    address: ['1290 Valencia St', 'Mission District', 'San Francisco, CA 94110', 'United States'],
    walk: 3
  },
  {
    id: 'ggpark',
    name: 'Golden Gate Park',
    kind: 'Park',
    category: 'park',
    lat: 37.7694,
    lon: -122.4862,
    address: ['501 Stanyan St', 'Richmond District', 'San Francisco, CA 94117', 'United States'],
    walk: 22
  },
  {
    id: 'pike',
    name: 'Pike Place Market',
    kind: 'Market',
    category: 'shop',
    lat: 47.6097,
    lon: -122.3422,
    address: ['85 Pike St', 'Downtown', 'Seattle, WA 98101', 'United States'],
    site: 'pikeplacemarket.org',
    walk: 8
  },
  {
    id: 'griffith',
    name: 'Griffith Observatory',
    kind: 'Observatory',
    category: 'museum',
    lat: 34.1184,
    lon: -118.3004,
    address: ['2800 E Observatory Rd', 'Los Feliz', 'Los Angeles, CA 90027', 'United States'],
    site: 'griffithobservatory.org',
    walk: 34
  },
  {
    id: 'katz',
    name: "Katz's Delicatessen",
    kind: 'Deli',
    category: 'food',
    lat: 40.7223,
    lon: -73.9874,
    address: ['205 E Houston St', 'Lower East Side', 'New York, NY 10002', 'United States'],
    phone: '+1 (212) 254-2246',
    walk: 5
  },
  {
    id: 'grand-central',
    name: 'Grand Central Terminal',
    kind: 'Train Station',
    category: 'rail',
    lat: 40.7527,
    lon: -73.9772,
    address: ['89 E 42nd St', 'Midtown', 'New York, NY 10017', 'United States'],
    walk: 13
  },
  {
    id: 'cloud-gate',
    name: 'Cloud Gate',
    kind: 'Sculpture',
    category: 'landmark',
    lat: 41.8827,
    lon: -87.6233,
    address: ['201 E Randolph St', 'The Loop', 'Chicago, IL 60602', 'United States'],
    walk: 10
  },
  {
    id: 'shibuya',
    name: 'Shibuya Station',
    kind: 'Train Station',
    category: 'rail',
    lat: 35.658,
    lon: 139.7016,
    address: ['2-1 Dogenzaka', 'Shibuya City', 'Tokyo 150-0043', 'Japan'],
    walk: 6
  },
  {
    id: 'louvre',
    name: 'Musée du Louvre',
    kind: 'Art Museum',
    category: 'museum',
    lat: 48.8606,
    lon: 2.3376,
    address: ['Rue de Rivoli', '1st arrondissement', '75001 Paris', 'France'],
    site: 'louvre.fr',
    walk: 17
  }
]

export const byId = (id: string) => PLACES.find((p) => p.id === id)

/** What the sidebar opens with: Siri's guess first, then the last few lookups. */
export const SUGGESTED = 'eye-stop'

/** Draw without replacement, so a recents list never repeats a place. */
const sample = <T>(xs: T[], n: number) => {
  const pool = [...xs]
  return Array.from({ length: Math.min(n, pool.length) }, () => pool.splice((Math.random() * pool.length) | 0, 1)[0]!)
}

/** No history to read, so the session opens on a handful of places picked at random. */
export const RECENT: [string, string][] = sample(PLACES, 3).map((p) => [
  p.id,
  p.category === 'address' ? 'From My Location' : `${p.address[0]}, ${p.address[1]}`
])

// ---------- web mercator ----------

/** One tile is 256 CSS px; the servers below hand back 512 px of pixels for it. */
export const TILE = 256
export const MIN_Z = 12
export const MAX_Z = 18

export type MapKind = 'explore' | 'satellite'

/**
 * OpenStreetMap Japan's MapTiler Basic raster, which is the closest keyless
 * style to Apple's light map, and Esri's imagery for the satellite mode.
 */
export const tileUrl = (kind: MapKind, x: number, y: number, z: number) =>
  kind === 'satellite'
    ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
    : `https://tile.openstreetmap.jp/styles/maptiler-basic-en/512/${z}/${x}/${y}.png`

/** Longitude/latitude to world pixels at this zoom. */
export const project = (lat: number, lon: number, z: number) => {
  const world = TILE * 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lon + 180) / 360) * world,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world
  }
}

export const unproject = (x: number, y: number, z: number) => {
  const world = TILE * 2 ** z
  return {
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / world))) * 180) / Math.PI,
    lon: (x / world) * 360 - 180
  }
}

/** Ground metres one pixel covers, which is what the scale bar measures. */
export const metresPerPixel = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z

const STEPS = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000]

/** The widest round half-distance that still fits the bar, as Apple's scale ticks it. */
export const scale = (lat: number, z: number) => {
  const mpp = metresPerPixel(lat, z)
  const half = STEPS.findLast((m) => m / mpp <= 46) ?? STEPS[0]!
  const km = half >= 1000
  return {
    width: (half * 2) / mpp,
    mid: km ? `${half / 1000}` : `${half}`,
    full: km ? `${(half * 2) / 1000} km` : `${half * 2} m`
  }
}
