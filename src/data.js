// Dades d'exemple del prototip

export const DONOR = {
  id: 'BST-84920',
  firstName: 'Marc',
  fullName: 'Marc Vila Soler',
  bloodGroup: '0-',
  level: 2,
  levelName: 'Donant compromès',
  email: 'marc.vila@estudiantat.upc.edu',
  phone: '+34 645 89 21 00',
  birthDate: '1998-08-14',
  municipality: 'Barcelona',
  district: 'Les Corts',
  postalCode: '08028',
  zone: 'Barcelona - Barcelonès',
  referenceCenter: { code: 'BST-HCB', name: 'Hospital Clínic de Barcelona' },
}

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
    distance: '300 m', hours: '09:00 - 20:30h', wait: '~5 min', x: 48, y: 45, open: true,
  },
  {
    code: 'BST-HCB', name: 'Hospital Universitari Clínic', kind: 'hospital', icon: 'hospital',
    address: 'C/ Villarroel 170, 08036 Barcelona', zone: 'Barcelona - Barcelonès',
    distance: '1.8 km', hours: '08:30 - 21:00h', wait: '~15 min', x: 58, y: 30, open: true,
  },
  {
    code: 'BST-HUB', name: 'Hospital Universitari de Bellvitge', kind: 'hospital', icon: 'hospital',
    address: 'Feixa Llarga s/n, 08907 L\'Hospitalet de Llobregat', zone: 'Barcelona - Baix Llobregat',
    distance: '4.2 km', hours: '09:00 - 20:00h', wait: '~10 min', x: 30, y: 68, open: true,
  },
]

// Tots els centres (els tres primers apareixen al mapa de «Donar")
export const CENTERS = [
  ...POINTS,
  { code: 'BST-TRU', name: 'Hospital Dr. Josep Trueta', kind: 'hospital', icon: 'hospital', address: 'Av. de França s/n, 17007 Girona', zone: 'Gironès' },
  { code: 'BST-MOB-UAB', name: 'Unitat mòbil UAB', kind: 'mobile_unit', icon: 'bus', address: 'Plaça Cívica, 08193 Bellaterra', zone: 'Vallès Occ.' },
]

export const VOLUME_ML = { whole_blood: 450, plasma: 600, platelets: 250, tissue_marrow: null }

// Historial de donacions del donant (registres ja completats)
export const DONATIONS = [
  { id: 'DON-2024-031501', type: 'whole_blood', date: '2024-03-15T10:20:00+01:00', volume: 450, center: 'BST-HCB' },
  { id: 'DON-2023-110802', type: 'whole_blood', date: '2023-11-08T17:40:00+01:00', volume: 450, center: 'BST-MOB-UPC' },
  { id: 'DON-2023-062104', type: 'plasma', date: '2023-06-21T11:05:00+02:00', volume: 600, center: 'BST-HCB' },
  { id: 'DON-2023-020903', type: 'platelets', date: '2023-02-09T09:30:00+01:00', volume: 250, center: 'BST-HCB' },
]

export const ZONES = ['Barcelona - Barcelonès', 'Gironès', 'Vallès Occ.', 'Baix Llobregat']

export const POSTS = [
  {
    id: 1, centerCode: 'BST-MOB-UPC', author: 'Laia Rovira', place: 'Barcelona - Barcelonès', zone: 'Barcelona - Barcelonès', minutesAgo: 10,
    text: 'Acabo de donar sang a l\'autobús de la UPC! Molt ràpid i l\'equip súper amable. Animeu-vos!',
    ratings: { time: 5, satisfaction: 5, again: 5 },
  },
  {
    id: 2, centerCode: null, author: 'Pol Casals', place: 'Campus Nord UPC, Barcelona', zone: 'Barcelona - Barcelonès', minutesAgo: 120,
    text: 'Algú sap si cal demanar cita prèvia per a donació de plasma aquesta tarda?',
    ratings: null,
  },
  {
    id: 3, centerCode: 'BST-HCB', author: 'Mireia Font', place: 'Hospital Clínic, Barcelona', zone: 'Barcelona - Barcelonès', minutesAgo: 1440,
    text: 'Primera vegada que dono plaquetes a l\'Hospital Clínic, experiència de 10!',
    ratings: { time: 3, satisfaction: 5, again: 5 },
  },
  {
    id: 4, centerCode: null, author: 'Arnau Puig', place: 'Barcelona - Barcelonès', zone: 'Barcelona - Barcelonès', minutesAgo: 4320,
    text: 'Recordeu que les reserves de 0− estan una mica baixes aquesta setmana. Qui pugui apropar-se a qualsevol punt fix serà de gran ajuda!',
    ratings: null,
  },
  {
    id: 5, centerCode: 'BST-TRU', author: 'Júlia Serra', place: 'Hospital Dr. Josep Trueta, Girona', zone: 'Gironès', minutesAgo: 2880,
    text: 'Vam anar tota la classe a donar al Trueta. Una mica d\'espera però val la pena.',
    ratings: { time: 2, satisfaction: 4, again: 4 },
  },
  {
    id: 6, centerCode: 'BST-MOB-UAB', author: 'Oriol Mas', place: 'Unitat mòbil UAB, Bellaterra', zone: 'Vallès Occ.', minutesAgo: 5760,
    text: 'Plasma fet entre classes. 45 minuts i a dinar!',
    ratings: { time: 4, satisfaction: 5, again: 5 },
  },
]

export const RATING_FIELDS = [
  { key: 'time', label: 'Temps', hint: 'Espera i durada' },
  { key: 'satisfaction', label: 'Satisfacció', hint: 'Tracte i experiència' },
  { key: 'again', label: 'Tornaria a donar', hint: 'Probabilitat de repetir' },
]
