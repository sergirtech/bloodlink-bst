// Capa de dades compartida entre l'app del donant i el backoffice del BST (Supabase).
//
// Hi ha dues sessions independents al mateix navegador: la del donant (app) i la del
// personal (backoffice). Així es poden tenir obertes alhora en pestanyes diferents.
// La seguretat la donen les polítiques RLS i les funcions de supabase/migrations/002_auth_qr.sql:
// cada donant només veu les seves dades i només el personal pot validar QR i tancar cites.

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const CONFIGURED = Boolean(URL && KEY)

/* ───────── Conversió files ↔ objectes de l'app ───────── */
const minutesSince = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))

export const donorFromRow = (r) => r && ({
  id: r.id, fullName: r.full_name, firstName: (r.full_name || '').split(' ')[0], bloodGroup: r.blood_group,
  birthDate: r.birth_date, email: r.email, phone: r.phone || '', zone: r.zone || '',
  municipality: r.municipality || '', district: r.district || '', postalCode: r.postal_code || '',
  referenceCenterCode: r.reference_center_code, qrToken: r.qr_token, createdAt: r.created_at,
})
const donorToRow = (d) => ({
  full_name: d.fullName, birth_date: d.birthDate || null, blood_group: d.bloodGroup || null, phone: d.phone || null,
  zone: d.zone || null, reference_center_code: d.referenceCenterCode || null,
  municipality: d.municipality || null, district: d.district || null, postal_code: d.postalCode || null,
})

const postFromRow = (r) => ({
  id: r.id, author: r.author, donorId: r.donor_id, place: r.place, zone: r.zone, centerCode: r.center_code,
  text: r.body, createdAt: r.created_at, minutesAgo: minutesSince(r.created_at),
  ratings: r.rating_time ? { time: r.rating_time, satisfaction: r.rating_satisfaction, again: r.rating_again } : null,
})

export const apptFromRow = (r) => r && ({
  id: r.id, donorId: r.donor_id, donorName: r.donor_name, phone: r.phone, email: r.email,
  typeId: r.donation_type, pointCode: r.center_code, start: r.scheduled_start, status: r.status,
  record: r.record, createdAt: r.created_at, checkinToken: r.checkin_token, checkedInAt: r.checked_in_at,
})

const donationFromRow = (r) => ({
  id: r.id, donorId: r.donor_id, type: r.donation_type, date: r.performed_at, volume: r.volume_ml,
  center: r.center_code, appointmentId: r.appointment_id,
})

/* ───────── Errors en català ───────── */
const AUTH_ERRORS = [
  [/invalid login credentials/i, 'Correu o contrasenya incorrectes.'],
  [/email not confirmed/i, 'Has de confirmar el correu abans d\'entrar. Revisa la safata d\'entrada.'],
  [/user already registered/i, 'Ja hi ha un compte amb aquest correu. Inicia sessió.'],
  [/password should be at least/i, 'La contrasenya ha de tenir almenys 8 caràcters.'],
  [/rate limit|too many/i, 'Massa intents seguits. Espera un moment i torna-ho a provar.'],
  [/unable to validate email|invalid email/i, 'El correu no és vàlid.'],
  [/failed to fetch|network/i, 'No hi ha connexió amb el servidor. Revisa la connexió a internet.'],
  [/jwt expired/i, 'La sessió ha caducat. Torna a iniciar sessió.'],
]
const friendly = (msg = '') => AUTH_ERRORS.find(([re]) => re.test(msg))?.[1] || msg

const check = ({ data, error }) => {
  if (error) throw new Error(friendly(error.message))
  return data
}

/* ───────── API (una per tipus de sessió) ───────── */
function makeApi(storageKey, detectSessionInUrl) {
  if (!CONFIGURED) return null
  const sb = createClient(URL, KEY, { auth: { storageKey, detectSessionInUrl, persistSession: true, autoRefreshToken: true } })
  const redirect = () => window.location.origin + window.location.pathname

  return {
    /* Sessió */
    getSession: async () => (await sb.auth.getSession()).data.session,
    // No s'ha de fer cap crida a Supabase dins del callback (pot bloquejar la sessió)
    onAuthChange: (cb) => {
      const { data } = sb.auth.onAuthStateChange((event, session) => cb(event, session))
      return () => data.subscription.unsubscribe()
    },
    signIn: async (email, password) => check(await sb.auth.signInWithPassword({ email: email.trim(), password })),
    /** Registre: les dades del perfil van a les metadades i un trigger crea el donant. */
    signUp: async (email, password, profile) => check(await sb.auth.signUp({
      email: email.trim(), password,
      options: {
        emailRedirectTo: redirect(),
        data: {
          full_name: profile.fullName, birth_date: profile.birthDate, blood_group: profile.bloodGroup || null,
          phone: profile.phone, zone: profile.zone, reference_center_code: profile.referenceCenterCode,
          municipality: profile.municipality, district: profile.district, postal_code: profile.postalCode,
        },
      },
    })),
    signOut: async () => { await sb.auth.signOut() },
    resetPassword: async (email) => check(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect() })),
    updatePassword: async (password) => check(await sb.auth.updateUser({ password })),

    /* Donant */
    getMyDonor: async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return null
      return donorFromRow(check(await sb.from('donors').select('*').eq('auth_user_id', user.id).maybeSingle()))
    },
    updateMyDonor: async (id, patch) => donorFromRow(check(await sb.from('donors').update(donorToRow(patch)).eq('id', id).select().single())),
    rotateMyQr: async () => check(await sb.rpc('rotate_my_qr')),

    /* Personal */
    getMyStaff: async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return null
      return check(await sb.from('staff').select('*').eq('user_id', user.id).maybeSingle())
    },
    verifyQr: async (payload) => {
      const r = check(await sb.rpc('verify_qr', {
        p_donor_id: payload.donor_id, p_token: payload.token,
        p_appointment_id: payload.appointment_id || null, p_appointment_token: payload.appointment_token || null,
      }))
      return { donor: donorFromRow(r.donor), appointment: apptFromRow(r.appointment) }
    },
    checkIn: async (id) => apptFromRow(check(await sb.rpc('check_in_appointment', { p_id: id }))),
    completeAppointment: async (id) => donationFromRow(check(await sb.rpc('complete_appointment', { p_id: id }))),
    setAppointmentStatus: async (id, status) => check(await sb.from('appointments').update({ status }).eq('id', id)),
    listDonors: async () => check(await sb.from('donors').select('*').order('created_at', { ascending: false })).map(donorFromRow),

    /* Fòrum */
    listPosts: async () => check(await sb.from('forum_posts').select('*').order('created_at', { ascending: false })).map(postFromRow),
    // L'autor el posa la base de dades a partir de la sessió
    addPost: async (p) => postFromRow(check(await sb.from('forum_posts').insert({
      author: '-', place: p.place, zone: p.zone, center_code: p.centerCode || null, body: p.text,
      rating_time: p.ratings?.time ?? null, rating_satisfaction: p.ratings?.satisfaction ?? null, rating_again: p.ratings?.again ?? null,
    }).select().single())),

    /* Cites i donacions (RLS: el donant només rep les seves) */
    listAppointments: async () => check(await sb.from('appointments').select('*').order('scheduled_start', { ascending: true })).map(apptFromRow),
    listDonations: async () => check(await sb.from('donations').select('*').order('performed_at', { ascending: false })).map(donationFromRow),
    /** Places ocupades per franja: { 'ISO': n } */
    slotUsage: async (center, from, to) => Object.fromEntries(
      check(await sb.rpc('slot_usage', { p_center: center, p_from: from.toISOString(), p_to: to.toISOString() }))
        .map((r) => [new Date(r.slot_start).toISOString(), r.booked])
    ),
    bookAppointment: async ({ typeId, pointCode, start, contact, record }) => apptFromRow(check(await sb.rpc('book_appointment', {
      p_type: typeId, p_center: pointCode, p_start: start.toISOString(),
      p_name: contact.name, p_phone: contact.phone, p_email: contact.email, p_record: record,
    }))),
    cancelAppointment: async (id) => check(await sb.rpc('cancel_my_appointment', { p_id: id })),

    /** Avisa quan canvien les dades (temps real). Retorna la funció per deixar d'escoltar. */
    subscribe: (onChange) => {
      const channel = sb.channel(`bst-${storageKey}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, onChange)
        .subscribe()
      return () => sb.removeChannel(channel)
    },
  }
}

export const donorApi = makeApi('bst-donor-session', true)
export const staffApi = makeApi('bst-staff-session', false)

/** Contingut JSON del QR del donant. El personal el valida amb verify_qr. */
export function qrPayload(donor, appt) {
  const active = appt && ['scheduled', 'checked_in'].includes(appt.status)
  return {
    type: 'bst.checkin',
    v: 1,
    donor_id: donor.id,
    token: donor.qrToken,
    appointment_id: active ? appt.id : null,
    appointment_token: active ? appt.checkinToken : null,
  }
}

/** Llegeix i valida el text d'un QR escanejat. Llança un error si no és un QR del BST. */
export function parseQr(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error('El QR no conté un JSON vàlid') }
  if (data?.type !== 'bst.checkin' || !data.donor_id || !data.token) throw new Error('Aquest QR no és un codi de donant del BST')
  return data
}
