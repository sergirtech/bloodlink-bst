// Utilitats de dates en català
export const DAY_NAMES = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']
export const MONTHS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre']
export const MONTHS_CAP = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1))

const de = (m) => (/^[aeiou]/.test(m) ? "d'" : 'de ')

export const fmtDate = (d) => `${d.getDate()} ${de(MONTHS[d.getMonth()])}${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
export const fmtDateTime = (iso) => {
  const d = new Date(iso)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${de(MONTHS[d.getMonth()])}${MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const timeAgo = (min) => {
  if (min < 60) return `Fa ${min} min`
  if (min < 1440) return `Fa ${Math.round(min / 60)} hores`
  if (min < 2880) return 'Ahir'
  return `Fa ${Math.round(min / 1440)} dies`
}

/** Propers dies laborables a partir d'avui (s'exclou diumenge). */
export function nextDays(count = 3) {
  const out = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  while (out.length < count) {
    if (d.getDay() !== 0) out.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}
