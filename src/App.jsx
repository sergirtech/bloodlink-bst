import { useCallback, useEffect, useState } from 'react'
import Icon from './components/Icon.jsx'
import { Avatar } from './components/ui.jsx'
import { DONOR } from './data.js'
import { listPosts, listDonations, listAppointments, subscribe } from './lib/db.js'
import Backoffice from './backoffice/Backoffice.jsx'
import Login from './screens/Login.jsx'
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
  login: ['home', 'Inici'], home: ['home', 'Inici'], donate: ['donate', 'Donar'], booking: ['donate', 'Donar'],
  confirm: ['donate', 'Donar'], community: ['community', 'Comunitat'], impact: ['impact', 'Impacte'],
  profile: ['home', 'El teu perfil'], history: ['home', 'Historial'],
}

// La propera cita activa del donant (o la que s'acaba de mostrar, amb l'estat actualitzat)
function pickAppointment(appts, current) {
  const same = current && appts.find((a) => a.id === current.id)
  if (same) return same
  return appts.filter((a) => a.status === 'scheduled' && new Date(a.start) > new Date()).at(0) || null
}

const isBackoffice = () => window.location.hash.startsWith('#/backoffice')

export default function App() {
  const [bo, setBo] = useState(isBackoffice)
  useEffect(() => {
    const onHash = () => setBo(isBackoffice())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return bo ? <Backoffice /> : <DonorApp />
}

function DonorApp() {
  const [screen, setScreen] = useState('login')
  const [toast, setToast] = useState(null)
  const [state, setState] = useState({
    typeId: 'plasma',
    pointCode: 'BST-MOB-UPC',
    appointment: null,
    posts: [],
    donations: [],
    loading: true,
    error: null,
  })

  // Carrega les dades de la base de dades i les manté actualitzades
  const refresh = useCallback(async () => {
    try {
      const [posts, donations, appts] = await Promise.all([
        listPosts(), listDonations({ donorId: DONOR.id }), listAppointments({ donorId: DONOR.id }),
      ])
      setState((st) => ({ ...st, posts, donations, appointment: pickAppointment(appts, st.appointment), loading: false, error: null }))
    } catch (e) {
      setState((st) => ({ ...st, loading: false, error: e.message }))
    }
  }, [])
  useEffect(() => {
    refresh()
    return subscribe(refresh)
  }, [refresh])

  const go = (s) => {
    setScreen(s)
    document.querySelector('.screen-body')?.scrollTo(0, 0)
  }
  const update = (patch) => setState((st) => ({ ...st, ...patch }))
  const notify = (msg) => {
    setToast(msg)
    clearTimeout(window.__t)
    window.__t = setTimeout(() => setToast(null), 2400)
  }

  const [tab, title] = META[screen]
  const props = { state, update, go, notify, refresh }
  const loggedIn = screen !== 'login'

  const SCREENS = { login: Login, home: Home, donate: Donate, booking: Booking, confirm: Confirmation, community: Community, impact: Impact, profile: Profile, history: History }
  const Screen = SCREENS[screen]

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
            {loggedIn && (
              <>
                <button className="bell" onClick={() => notify('Reserves de 0− baixes a la teva zona')} aria-label="Notificacions">
                  <Icon name="bell" size={22} /><i />
                </button>
                <button onClick={() => go('profile')} aria-label="El teu perfil"><Avatar size={38} ring /></button>
              </>
            )}
          </header>

          <div className="screen-body" key={screen}>
            {state.error && <div className="db-error">No s'ha pogut connectar amb la base de dades: {state.error}</div>}
            <Screen {...props} />
          </div>

          <nav className="tabbar">
            {TABS.map(([id, icon, label]) => (
              <button key={id} className={loggedIn && tab === id ? 'on' : ''} onClick={() => go(loggedIn ? id : 'login')}>
                <Icon name={icon} size={22} />
                {label}
              </button>
            ))}
          </nav>
          {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
        </div>
      </div>
    </main>
  )
}
