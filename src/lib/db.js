// Capa de dades compartida entre l'app del donant i el backoffice del BST.
//
// · Si hi ha VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY → base de dades Supabase
//   (les dades es comparteixen entre dispositius i s'actualitzen en temps real).
// · Si no → mode local: les dades es guarden al navegador (localStorage) i es
//   sincronitzen entre pestanyes. Útil per provar-ho sense configurar res.
//
// L'app i el backoffice només fan servir les funcions exportades d'aquí,
// així que canviar de mode no afecta cap pantalla.

import { createClient } from '@supabase/supabase-js'
import { POSTS, DONATIONS, VOLUME_ML } from '../data.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

export const MODE = supabase ? 'supabase' : 'local'

/* ───────── Conversió files ↔ objectes de l'app ───────── */
const minutesSince = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))

const postFromRow = (r) => ({
  id: r.id, author: r.author, place: r.place, zone: r.zone, centerCode: r.center_code,
  text: r.body, createdAt: r.created_at, minutesAgo: minutesSince(r.created_at),
  ratings: r.rating_time ? { time: r.rating_time, satisfaction: r.rating_satisfaction, again: r.rating_again } : null,
})
const postToRow = (p) => ({
  author: p.author, place: p.place, zone: p.zone, center_code: p.centerCode || null, body: p.text,
  rating_time: p.ratings?.time ?? null, rating_satisfaction: p.ratings?.satisfaction ?? null, rating_again: p.ratings?.again ?? null,
})

const apptFromRow = (r) => ({
  id: r.id, donorId: r.donor_id, donorName: r.donor_name, phone: r.phone, email: r.email,
  typeId: r.donation_type, pointCode: r.center_code, start: r.scheduled_start, status: r.status,
  record: r.record, createdAt: r.created_at,
})
const apptToRow = (a) => ({
  id: a.id, donor_id: a.donorId, donor_name: a.donorName, phone: a.phone, email: a.email,
  donation_type: a.typeId, center_code: a.pointCode, scheduled_start: a.start, status: a.status || 'scheduled', record: a.record,
})

const donationFromRow = (r) => ({
  id: r.id, donorId: r.donor_id, type: r.donation_type, date: r.performed_at, volume: r.volume_ml,
  center: r.center_code, appointmentId: r.appointment_id,
})
const donationToRow = (d) => ({
  id: d.id, donor_id: d.donorId, donation_type: d.type, performed_at: d.date, volume_ml: d.volume,
  center_code: d.center, appointment_id: d.appointmentId || null,
})

/* ───────── Mode local (localStorage) ───────── */
const LS_KEY = 'bst-app-db-v1'
const LOCAL_EVENT = 'bst-db-change'

function seed() {
  const now = Date.now()
  return {
    posts: POSTS.map((p) => ({ ...postToRow(p), id: p.id, created_at: new Date(now - p.minutesAgo * 60000).toISOString() })),
    appointments: [],
    donations: DONATIONS.map((d) => donationToRow({ ...d, donorId: 'BST-84920' })),
  }
}
function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* emmagatzematge no disponible */ }
  const s = seed()
  writeLocal(s, false)
  return s
}
function writeLocal(db, notify = true) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignora */ }
  if (notify) window.dispatchEvent(new Event(LOCAL_EVENT))
}

/* ───────── API ───────── */
const check = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

export async function listPosts() {
  if (supabase) return check(await supabase.from('forum_posts').select('*').order('created_at', { ascending: false })).map(postFromRow)
  return readLocal().posts.map(postFromRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addPost(post) {
  if (supabase) return postFromRow(check(await supabase.from('forum_posts').insert(postToRow(post)).select().single()))
  const db = readLocal()
  const row = { ...postToRow(post), id: Date.now(), created_at: new Date().toISOString() }
  db.posts.unshift(row)
  writeLocal(db)
  return postFromRow(row)
}

export async function listAppointments({ donorId } = {}) {
  if (supabase) {
    let q = supabase.from('appointments').select('*').order('scheduled_start', { ascending: true })
    if (donorId) q = q.eq('donor_id', donorId)
    return check(await q).map(apptFromRow)
  }
  return readLocal().appointments.filter((a) => !donorId || a.donor_id === donorId).map(apptFromRow)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export async function createAppointment(appt) {
  if (supabase) return apptFromRow(check(await supabase.from('appointments').insert(apptToRow(appt)).select().single()))
  const db = readLocal()
  const row = { ...apptToRow(appt), created_at: new Date().toISOString() }
  db.appointments.push(row)
  writeLocal(db)
  return apptFromRow(row)
}

export async function setAppointmentStatus(id, status) {
  if (supabase) return check(await supabase.from('appointments').update({ status }).eq('id', id))
  const db = readLocal()
  const a = db.appointments.find((x) => x.id === id)
  if (a) a.status = status
  writeLocal(db)
}

export async function listDonations({ donorId } = {}) {
  if (supabase) {
    let q = supabase.from('donations').select('*').order('performed_at', { ascending: false })
    if (donorId) q = q.eq('donor_id', donorId)
    return check(await q).map(donationFromRow)
  }
  return readLocal().donations.filter((d) => !donorId || d.donor_id === donorId).map(donationFromRow)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** El personal del BST marca la cita com a feta: es crea la donació i la cita passa a «completed». */
export async function completeAppointment(appt) {
  const now = new Date()
  const donation = {
    id: `DON-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 90) + 10)}`,
    donorId: appt.donorId, type: appt.typeId, date: now.toISOString(),
    volume: VOLUME_ML[appt.typeId], center: appt.pointCode, appointmentId: appt.id,
  }
  if (supabase) {
    check(await supabase.from('donations').insert(donationToRow(donation)))
    check(await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id))
    return donation
  }
  const db = readLocal()
  db.donations.push(donationToRow(donation))
  const a = db.appointments.find((x) => x.id === appt.id)
  if (a) a.status = 'completed'
  writeLocal(db)
  return donation
}

/** Avisa quan canvien les dades (altres dispositius, pestanyes o el backoffice). Retorna la funció per deixar d'escoltar. */
export function subscribe(onChange) {
  if (supabase) {
    const channel = supabase.channel('bst-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, onChange)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const onStorage = (e) => { if (!e.key || e.key === LS_KEY) onChange() }
  window.addEventListener('storage', onStorage)
  window.addEventListener(LOCAL_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(LOCAL_EVENT, onChange)
  }
}

/** Només mode local: torna a les dades d'exemple. */
export function resetLocal() {
  if (!supabase) writeLocal(seed())
}
