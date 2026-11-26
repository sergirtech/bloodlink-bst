// Catàleg del prototip: tipus de donació, punts i centres del BST.
// Les dades dels donants, cites, donacions i fòrum són a Supabase.

export const DONATION_TYPES = [
  { id: 'whole_blood', label: 'Sang', icon: 'drop', minutes: 30, volume: 450 },
  { id: 'plasma', label: 'Plasma', icon: 'activity', minutes: 45, volume: 600 },
  { id: 'platelets', label: 'Plaquetes', icon: 'platelets', minutes: 75, volume: 250 },
  { id: 'tissue_marrow', label: 'Teixits / Medul·la', icon: 'tissue', minutes: 20, volume: null },
]

export const POINTS = [
  {
    code: 'BST-MOB-UPC', name: 'Autobús Campus Nord UPC', kind: 'mobile_unit', icon: 'bus',
    address: 'Plaça Telecos, C/ Jordi Girona 1–3, 08034 Barcelona', zone: 'Barcelona - Barcelonès',
    distance: '300 m', hours: '09:00 - 20:30h', wait: '~5 min', x: 48, y: 45, lat: 41.3894, lng: 2.1130,
  },
  {
    code: 'BST-HCB', name: 'Hospital Universitari Clínic', kind: 'hospital', icon: 'hospital',
    address: 'C/ Villarroel 170, 08036 Barcelona', zone: 'Barcelona - Barcelonès',
    distance: '1.8 km', hours: '08:30 - 21:00h', wait: '~15 min', x: 58, y: 30, lat: 41.3891, lng: 2.1520,
  },
  {
    code: 'BST-HUB', name: 'Hospital Universitari de Bellvitge', kind: 'hospital', icon: 'hospital',
    address: 'Feixa Llarga s/n, 08907 L\'Hospitalet de Llobregat', zone: 'Barcelona - Baix Llobregat',
    distance: '4.2 km', hours: '09:00 - 20:00h', wait: '~10 min', x: 30, y: 68, lat: 41.3446, lng: 2.1044,
  },
]

// Tots els centres (els tres primers apareixen al mapa de «Donar")
export const CENTERS = [
  ...POINTS,
  { code: 'BST-TRU', name: 'Hospital Dr. Josep Trueta', kind: 'hospital', icon: 'hospital', address: 'Av. de França s/n, 17007 Girona', zone: 'Gironès', hours: '08:30 - 20:30h', lat: 41.9969, lng: 2.8169 },
  { code: 'BST-MOB-UAB', name: 'Unitat mòbil UAB', kind: 'mobile_unit', icon: 'bus', address: 'Plaça Cívica, 08193 Bellaterra', zone: 'Vallès Occ.', hours: '09:00 - 15:00h', lat: 41.5020, lng: 2.1050 },
]

export const VOLUME_ML = { whole_blood: 450, plasma: 600, platelets: 250, tissue_marrow: null }

export const ZONES = ['Barcelona - Barcelonès', 'Gironès', 'Vallès Occ.', 'Baix Llobregat']

export const RATING_FIELDS = [
  { key: 'time', label: 'Temps', hint: 'Espera i durada' },
  { key: 'satisfaction', label: 'Satisfacció', hint: 'Tracte i experiència' },
  { key: 'again', label: 'Tornaria a donar', hint: 'Probabilitat de repetir' },
]

/** Obert ara segons l'horari «HH:MM - HH:MMh» (de dilluns a dissabte). */
export function isOpenNow(hours, now = new Date()) {
  const m = hours && hours.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/)
  if (!m || now.getDay() === 0) return false
  const min = now.getHours() * 60 + now.getMinutes()
  return min >= +m[1] * 60 + +m[2] && min < +m[3] * 60 + +m[4]
}

/** Distància en km entre dos punts (fórmula de Haversine). */
export function distanceKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)
