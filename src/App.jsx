import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from './components/Icon.jsx'
import { Avatar } from './components/ui.jsx'
import { CENTERS } from './data.js'
import { CONFIGURED, donorApi as api } from './lib/db.js'
import { nextEligibleDate } from './lib/donor.js'
import { fmtDate, fmtDateTime } from './lib/dates.js'
import Backoffice from './backoffice/Backoffice.jsx'
import Login from './screens/Login.jsx'
import Register from './screens/Register.jsx'
import { ForgotPassword, ResetPassword } from './screens/Recover.jsx'
import Home from './screens/Home.jsx'
import Donate from './screens/Donate.jsx'
import Booking from './screens/Booking.jsx'
import Confirmation from './screens/Confirmation.jsx'
import Community from './screens/Community.jsx'
import Impact from './screens/Impact.jsx'
import Profile from './screens/Profile.jsx'
import History from './screens/History.jsx'

const TABS = [
  ['home', 'drop', 'Inici'],
  ['donate', 'calendar', 'Donar'],
  ['impact', 'medal', 'Impacte'],
  ['community', 'users', 'Comunitat'],
]

// Pantalla → pestanya activa i títol de la capçalera
const META = {
  home: ['home', 'Inici'], donate: ['donate', 'Donar'], booking: ['donate', 'Donar'],
  confirm: ['donate', 'Donar'], community: ['community', 'Comunitat'], impact: ['impact', 'Impacte'],
  profile: ['home', 'El teu perfil'], history: ['home', 'Historial'],
}
const SCREENS = { home: Home, donate: Donate, booking: Booking, confirm: Confirmation, community: Community, impact: Impact, profile: Profile, history: History }
const AUTH = { login: [Login, 'Inici de sessió'], register: [Register, 'Registre'], forgot: [ForgotPassword, 'Recuperar accés'] }

const ACTIVE = ['scheduled', 'checked_in']
// Cita a mostrar: la que s'acaba de reservar (amb l'estat actualitzat) o la propera activa
function pickAppointment(appts, current) {
  const same = current && appts.find((a) => a.id === current.id)
  if (same) return same
  return appts.find((a) => ACTIVE.includes(a.status) && new Date(a.start) > Date.now() - 3 * 3600e3) || null
}

const isBackoffice = () => window.location.hash.startsWith('#/backoffice')

export default function App() {
  const [bo, setBo] = useState(isBackoffice)
  useEffect(() => {
    const onHash = () => setBo(isBackoffice())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  if (!CONFIGURED) return <ConfigMissing />
  return bo ? <Backoffice /> : <DonorApp />
}

function ConfigMissing() {
  return (
    <main className="stage">
      <div className="config-missing">
        <h1>Falta la configuració de Supabase</h1>
        <p>Crea el fitxer <code>.env</code> amb <code>VITE_SUPABASE_URL</code> i <code>VITE_SUPABASE_ANON_KEY</code> (vegeu <code>.env.example</code>).</p>
      </div>
    </main>
  )
}

/* ───────── Marc del mòbil ───────── */
function Phone({ title, right, children, tabbar, toast }) {
  return (
    <main className="stage">
      <div className="phone">
        <div className="phone-screen">
          <header className="appbar">
            <span className="logo"><Icon name="dropFill" size={18} color="#fff" stroke={0} /></span>
            <div className="appbar-title">
              <span>BANC DE SANG</span>
              <b>{title}</b>
            </div>
            <span className="grow" />
            {right}
          </header>
          {children}
          {tabbar}
          {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
        </div>
      </div>
    </main>
  )
}

function useToast() {
  const [toast, setToast] = useState(null)
  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(window.__t)
    window.__t = setTimeout(() => setToast(null), 2800)
  }, [])
  return [toast, notify]
}

const Splash = ({ text }) => (
  <div className="screen-body"><div className="splash"><span className="spinner" />{text && <p className="muted small">{text}</p>}</div></div>
)

function DonorApp() {
  const [session, setSession] = useState(undefined) // undefined = comprovant la sessió
  const [recovery, setRecovery] = useState(false)
  const [authScreen, setAuthScreen] = useState('login')
  const [toast, notify] = useToast()

  useEffect(() => {
    api.getSession().then((s) => setSession(s ?? null))
    return api.onAuthChange((event, s) => {
      setSession(s ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setAuthScreen('login')
    })
  }, [])

  if (session === undefined) return <Phone title="BST App"><Splash /></Phone>

  if (session && recovery) {
    return (
      <Phone title="Nova contrasenya" toast={toast}>
        <div className="screen-body"><ResetPassword api={api} notify={notify} done={() => setRecovery(false)} /></div>
      </Phone>
    )
  }

  if (!session) {
    const [Screen, title] = AUTH[authScreen]
    return (
      <Phone title={title} toast={toast}>
        <div className="screen-body" key={authScreen}>
          <Screen api={api} go={setAuthScreen} notify={notify} />
        </div>
      </Phone>
    )
  }

  return <DonorSession key={session.user.id} notify={notify} toast={toast} />
}

/* ───────── App amb sessió iniciada ───────── */
function DonorSession({ notify, toast }) {
  const [screen, setScreen] = useState('home')
  const [bellOpen, setBellOpen] = useState(false)
  const [seen, setSeen] = useState(() => localStorage.getItem('bst-notif-seen') || '')
  const [state, setState] = useState({
    donor: null, typeId: 'whole_blood', pointCode: 'BST-MOB-UPC',
    appointment: null, appointments: [], posts: [], donations: [], loading: true, error: null,
  })

  // Carrega les dades i les manté actualitzades en temps real
  const refresh = useCallback(async () => {
    try {
      const [donor, posts, donations, appointments] = await Promise.all([
        api.getMyDonor(), api.listPosts(), api.listDonations(), api.listAppointments(),
      ])
      setState((st) => ({
        ...st, donor, posts, donations, appointments,
        appointment: pickAppointment(appointments, st.appointment),
        // La primera vegada, el punt seleccionat és el centre de referència (si és al mapa)
        pointCode: st.loading && CENTERS.some((c) => c.code === donor?.referenceCenterCode && c.x != null)
          ? donor.referenceCenterCode : st.pointCode,
        loading: false, error: null,
      }))
    } catch (e) {
      setState((st) => ({ ...st, loading: false, error: e.message }))
    }
  }, [])
  useEffect(() => {
    refresh()
    return api.subscribe(refresh)
  }, [refresh])

  const go = (s) => {
    setScreen(s)
    setBellOpen(false)
    document.querySelector('.screen-body')?.scrollTo(0, 0)
  }
  const update = (patch) => setState((st) => ({ ...st, ...patch }))
  const signOut = async () => { await api.signOut(); notify('Sessió tancada') }

  const notifications = useNotifications(state)
  const key = notifications.map((n) => n.id).join('|')
  const unread = notifications.length > 0 && key !== seen
  const toggleBell = () => {
    setBellOpen(!bellOpen)
    localStorage.setItem('bst-notif-seen', key)
    setSeen(key)
  }

  const [tab, title] = META[screen]
  const { donor } = state

  if (state.loading) return <Phone title="Inici"><Splash text="Carregant les teves dades…" /></Phone>

  if (!donor) {
    return (
      <Phone title="Compte" toast={toast}>
        <div className="screen-body">
          <div className="content center">
            {state.error
              ? <div className="db-error">No s'ha pogut connectar amb la base de dades: {state.error}</div>
              : <p className="muted">Aquest compte no té cap perfil de donant associat. Si ets personal del BST, entra pel backoffice.</p>}
            <button className="btn btn-primary" onClick={refresh}><Icon name="history" size={18} /> Tornar-ho a provar</button>
            <button className="link red strong" onClick={signOut}>Tancar sessió</button>
          </div>
        </div>
      </Phone>
    )
  }

  const Screen = SCREENS[screen]
  const props = { state, update, go, notify, refresh, api, donor, signOut }

  return (
    <Phone
      title={title}
      toast={toast}
      right={<>
        <button className="bell" onClick={toggleBell} aria-label="Notificacions" aria-expanded={bellOpen}>
          <Icon name="bell" size={22} />{unread && <i />}
        </button>
        <button onClick={() => go('profile')} aria-label="El teu perfil"><Avatar name={donor.fullName} size={38} ring /></button>
      </>}
      tabbar={
        <nav className="tabbar">
          {TABS.map(([id, icon, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>
              <Icon name={icon} size={22} />
              {label}
            </button>
          ))}
        </nav>
      }
    >
      {bellOpen && <NotificationPanel items={notifications} go={go} close={() => setBellOpen(false)} />}
      <div className="screen-body" key={screen}>
        {state.error && <div className="db-error">No s'ha pogut actualitzar: {state.error}</div>}
        <Screen {...props} />
      </div>
    </Phone>
  )
}

/* ───────── Notificacions calculades amb les dades reals ───────── */
function useNotifications(state) {
  return useMemo(() => {
    const out = []
    const { donor, appointment: a, donations } = state
    if (!donor) return out
    const active = a && ACTIVE.includes(a.status)
    if (active) {
      const hours = (new Date(a.start) - Date.now()) / 3600e3
      const c = CENTERS.find((x) => x.code === a.pointCode)
      out.push(hours < 48
        ? { id: `rem-${a.id}`, icon: 'calendar', tone: 'teal', title: 'Recordatori de cita', text: `${fmtDateTime(a.start)} · ${c?.name}. Porta el DNI i el QR.`, to: 'confirm' }
        : { id: `appt-${a.id}`, icon: 'calendar', tone: 'indigo', title: 'Cita programada', text: `${fmtDateTime(a.start)} · ${c?.name}`, to: 'confirm' })
    }
    const recent = donations.find((d) => d.appointmentId && Date.now() - new Date(d.date) < 7 * 86400e3)
    if (recent) out.push({ id: `thanks-${recent.id}`, icon: 'heart', tone: 'red', title: 'Gràcies per donar!', text: 'El BST ha registrat la teva donació. Ja la tens a l\'historial.', to: 'history' })
    if (!active) {
      const next = nextEligibleDate(donations)
      out.push(next
        ? { id: `wait-${next.toDateString()}`, icon: 'clock', tone: 'amber', title: 'Període de descans', text: `Podràs tornar a donar a partir del ${fmtDate(next)}.`, to: 'impact' }
        : { id: 'eligible', icon: 'dropFill', tone: 'red', title: 'Ja pots tornar a donar', text: 'Reserva hora al punt més proper.', to: 'donate' })
    }
    if (!donor.bloodGroup || !donor.phone) out.push({ id: 'profile', icon: 'user', tone: 'indigo', title: 'Completa el perfil', text: 'Afegeix el telèfon i el grup sanguini per agilitzar les cites.', to: 'profile' })
    return out
  }, [state])
}

function NotificationPanel({ items, go, close }) {
  return (
    <>
      <div className="notif-backdrop" onClick={close} />
      <div className="notif-panel" role="dialog" aria-label="Notificacions">
        <b className="notif-head">Notificacions</b>
        {items.length === 0 && <p className="small muted">No tens notificacions noves.</p>}
        {items.map((n) => (
          <button key={n.id} className="notif-item" onClick={() => go(n.to)}>
            <span className={`iconbox sm ib-${n.tone}`}><Icon name={n.icon} size={16} /></span>
            <span><b className="small">{n.title}</b><span className="xs muted">{n.text}</span></span>
          </button>
        ))}
      </div>
    </>
  )
}
