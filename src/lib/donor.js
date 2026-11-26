// Dades derivades del donant: nivell, punts, aptitud per donar i grup sanguini.
// Les regles d'espera coincideixen amb wait_days() de supabase/migrations/002_auth_qr.sql.

export const BLOOD_GROUPS = ['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']

// Dies d'espera després de cada tipus de donació
export const WAIT_DAYS = { whole_blood: 60, plasma: 14, platelets: 14, tissue_marrow: 0 }

// Punts per tipus de donació
export const POINTS_PER = { whole_blood: 3, plasma: 2, platelets: 3, tissue_marrow: 5 }

export const LEVELS = [
  { n: 1, min: 0, name: 'Nou donant' },
  { n: 2, min: 9, name: 'Donant compromès' },
  { n: 3, min: 21, name: 'Donant vital' },
  { n: 4, min: 45, name: 'Donant heroi' },
]

export function levelInfo(donations) {
  const points = donations.reduce((a, d) => a + (POINTS_PER[d.type] || 0), 0)
  const level = [...LEVELS].reverse().find((l) => points >= l.min)
  const next = LEVELS.find((l) => l.min > points) || null
  return { points, level, next, goal: next ? next.min : points }
}

/** Data a partir de la qual pot tornar a donar (null si ja pot). */
export function nextEligibleDate(donations) {
  if (!donations.length) return null
  const last = [...donations].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  const d = new Date(last.date)
  d.setDate(d.getDate() + (WAIT_DAYS[last.type] || 0))
  return d > new Date() ? d : null
}

export function bloodLabel(group) {
  if (!group) return { short: '¿?', long: 'Pendent', universal: false }
  const neg = group.endsWith('-')
  return {
    short: group.replace('-', '−'),
    long: neg ? 'Negatiu' : 'Positiu',
    universal: group === '0-',
  }
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

export function age(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

/** Requisits bàsics per registrar-se com a donant (18–65 anys). */
export function ageError(birthDate) {
  const a = age(birthDate)
  if (a == null) return 'Indica la data de naixement'
  if (a < 18) return 'Cal ser major d\'edat per donar sang'
  if (a > 65) return 'Per sobre de 65 anys cal consultar-ho amb el BST'
  return null
}

export const phoneOk = (p) => /^\+?[\d\s]{9,15}$/.test((p || '').trim())
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim())
export const postalOk = (p) => !p || /^\d{5}$/.test(p.trim())
