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

// Funció de la base de dades encara no creada (migració 002 pendent)
const missingFn = (error) => error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message))

// Mode demo: si la migració 002 no està aplicada, qualsevol compte entra com el donant de demo
export const DEMO_DONOR_ID = 'BST-84920'
const VOLUME = { whole_blood: 450, plasma: 600, platelets: 250, tissue_marrow: null }
const rand = (n) => Math.floor(Math.random() * 9 * 10 ** (n - 1)) + 10 ** (n - 1)

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
      const mine = check(await sb.from('donors').select('*').eq('auth_user_id', user.id).maybeSingle())
      if (mine) return donorFromRow(mine)
      // Crea el perfil si no en té (funció ensure_my_donor); si no existeix, donant de demo
      const r = await sb.rpc('ensure_my_donor')
      if (!r.error) return donorFromRow(r.data)
      if (!missingFn(r.error)) throw new Error(friendly(r.error.message))
      return donorFromRow(check(await sb.from('donors').select('*').eq('id', DEMO_DONOR_ID).maybeSingle()))
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
      const r = await sb.rpc('verify_qr', {
        p_donor_id: payload.donor_id, p_token: payload.token,
        p_appointment_id: payload.appointment_id || null, p_appointment_token: payload.appointment_token || null,
      })
      if (!r.error) return { donor: donorFromRow(r.data.donor), appointment: apptFromRow(r.data.appointment) }
      if (!missingFn(r.error)) throw new Error(friendly(r.error.message))
      // Alternativa: comprova els tokens directament
      const d = check(await sb.from('donors').select('*').eq('id', payload.donor_id).maybeSingle())
      if (!d || d.qr_token !== payload.token) throw new Error('QR no vàlid: el donant no existeix o el codi s\'ha renovat')
      let a = null
      if (payload.appointment_id) {
        a = check(await sb.from('appointments').select('*').eq('id', payload.appointment_id).maybeSingle())
        if (!a || a.donor_id !== d.id || a.checkin_token !== payload.appointment_token) throw new Error('QR no vàlid: la cita no correspon a aquest donant')
      }
      return { donor: donorFromRow(d), appointment: apptFromRow(a) }
    },
    checkIn: async (id) => {
      const r = await sb.rpc('check_in_appointment', { p_id: id })
      if (!r.error) return apptFromRow(r.data)
      if (!missingFn(r.error)) throw new Error(friendly(r.error.message))
      return apptFromRow(check(await sb.from('appointments').update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
        .eq('id', id).eq('status', 'scheduled').select().single()))
    },
    completeAppointment: async (id) => {
      const r = await sb.rpc('complete_appointment', { p_id: id })
      if (!r.error) return donationFromRow(r.data)
      if (!missingFn(r.error)) throw new Error(friendly(r.error.message))
      const a = check(await sb.from('appointments').select('*').eq('id', id).single())
      if (!['scheduled', 'checked_in'].includes(a.status)) throw new Error('Aquesta cita ja està tancada')
      const now = new Date()
      const row = {
        id: `DON-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${rand(4)}`,
        donor_id: a.donor_id, donation_type: a.donation_type, performed_at: now.toISOString(),
        volume_ml: VOLUME[a.donation_type], center_code: a.center_code, appointment_id: a.id,
      }
      const d = check(await sb.from('donations').insert(row).select().single())
      check(await sb.from('appointments').update({ status: 'completed', checked_in_at: a.checked_in_at || now.toISOString() }).eq('id', id))
      return donationFromRow(d)
    },
    setAppointmentStatus: async (id, status) => check(await sb.from('appointments').update({ status }).eq('id', id)),
    listDonors: async () => check(await sb.from('donors').select('*').order('created_at', { ascending: false })).map(donorFromRow),

    /* Fòrum */
    listPosts: async () => check(await sb.from('forum_posts').select('*').order('created_at', { ascending: false })).map(postFromRow),
    // L'autor el posa la base de dades a partir de la sessió
    addPost: async (p) => postFromRow(check(await sb.from('forum_posts').insert({
      author: p.author || 'Donant', place: p.place, zone: p.zone, center_code: p.centerCode || null, body: p.text,
      rating_time: p.ratings?.time ?? null, rating_satisfaction: p.ratings?.satisfaction ?? null, rating_again: p.ratings?.again ?? null,
    }).select().single())),

    /* Cites i donacions (RLS: el donant només rep les seves) */
    listAppointments: async (donorId) => {
      let q = sb.from('appointments').select('*').order('scheduled_start', { ascending: true })
      if (donorId) q = q.eq('donor_id', donorId)
      return check(await q).map(apptFromRow)
    },
    listDonations: async (donorId) => {
      let q = sb.from('donations').select('*').order('performed_at', { ascending: false })
      if (donorId) q = q.eq('donor_id', donorId)
      return check(await q).map(donationFromRow)
    },
    /** Places ocupades per franja: { 'ISO': n } */
    slotUsage: async (center, from, to) => {
      const r = await sb.rpc('slot_usage', { p_center: center, p_from: from.toISOString(), p_to: to.toISOString() })
      let rows
      if (!r.error) rows = r.data
      else if (missingFn(r.error)) {
        const list = check(await sb.from('appointments').select('scheduled_start').eq('center_code', center)
          .in('status', ['scheduled', 'checked_in']).gte('scheduled_start', from.toISOString()).lt('scheduled_start', to.toISOString()))
        const count = {}
        list.forEach((x) => { const k = new Date(x.scheduled_start).toISOString(); count[k] = (count[k] || 0) + 1 })
        return count
      } else throw new Error(friendly(r.error.message))
      return Object.fromEntries(rows.map((x) => [new Date(x.slot_start).toISOString(), x.booked]))
    },
    bookAppointment: async ({ donor, typeId, pointCode, start, contact, record }) => {
      const r = await sb.rpc('book_appointment', {
        p_type: typeId, p_center: pointCode, p_start: start.toISOString(),
        p_name: contact.name, p_phone: contact.phone, p_email: contact.email, p_record: record,
      })
      if (!r.error) return apptFromRow(r.data)
      if (!missingFn(r.error)) throw new Error(friendly(r.error.message))
      // Alternativa: mateixes comprovacions des de l'app
      if (start <= new Date()) throw new Error('Aquesta hora ja ha passat. Tria\'n una altra.')
      const mine = check(await sb.from('appointments').select('id').eq('donor_id', donor.id).in('status', ['scheduled', 'checked_in'])
        .gt('scheduled_start', new Date(Date.now() - 3 * 3600e3).toISOString()))
      if (mine.length) throw new Error('Ja tens una cita programada. Cancel·la-la abans de reservar-ne una altra.')
      const taken = check(await sb.from('appointments').select('id').eq('center_code', pointCode).eq('scheduled_start', start.toISOString())
        .in('status', ['scheduled', 'checked_in']))
      if (taken.length >= 2) throw new Error('Aquesta franja s\'acaba d\'omplir. Tria\'n una altra.')
      const id = `CITA-${start.getFullYear()}-${rand(6)}`
      const rec = { ...record, appointment: { ...record.appointment, appointment_id: id } }
      return apptFromRow(check(await sb.from('appointments').insert({
        id, donor_id: donor.id, donor_name: contact.name, phone: contact.phone, email: contact.email,
        donation_type: typeId, center_code: pointCode, scheduled_start: start.toISOString(), status: 'scheduled', record: rec,
      }).select().single()))
    },
    cancelAppointment: async (id) => {
      const r = await sb.rpc('cancel_my_appointment', { p_id: id })
      if (!r.error) return
      if (!missingFn(r.error)) throw new Error(friendly(r.error.message))
      check(await sb.from('appointments').update({ status: 'cancelled' }).eq('id', id).eq('status', 'scheduled'))
    },

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
