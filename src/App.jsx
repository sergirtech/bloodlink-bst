import { useState } from 'react'
import Icon from './components/Icon.jsx'
import { Avatar } from './components/ui.jsx'
import { POSTS, DONATIONS } from './data.js'
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

const JUMP = [
  ['login', "Inici de sessió"], ['home', 'Inici'], ['donate', 'Donar'], ['booking', "Reserva d'hora"],
  ['community', 'Comunitat'], ['impact', 'Impacte'], ['profile', 'Perfil'], ['history', 'Historial JSON'],
]

export default function App() {
  const [screen, setScreen] = useState('login')
  const [toast, setToast] = useState(null)
  const [state, setState] = useState({
    typeId: 'plasma',
    pointCode: 'BST-MOB-UPC',
    appointment: null,
    posts: POSTS,
    donations: DONATIONS,
  })

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
  const props = { state, update, go, notify }
  const loggedIn = screen !== 'login'

  const SCREENS = { login: Login, home: Home, donate: Donate, booking: Booking, confirm: Confirmation, community: Community, impact: Impact, profile: Profile, history: History }
  const Screen = SCREENS[screen]

  return (
    <main className="stage">
      <aside className="notes">
        <span className="notes-kicker">Prototip · Banc de Sang i Teixits</span>
        <h1>BST App</h1>
        <p>Prototip navegable del disseny d'Adrian Ursu, Álvaro García i Sergi Romero.</p>
        <nav className="jump">
          {JUMP.map(([id, l]) => (
            <button key={id} className={screen === id ? 'on' : ''} onClick={() => go(id)}>{l}</button>
          ))}
        </nav>
        <div className="notes-box">
          <b>Novetats d'aquesta versió</b>
          <p><Icon name="code" size={15} /> Registre de donacions exportable en <b>JSON</b> per als sistemes actuals del BST.</p>
          <p><Icon name="star" size={15} /> Missatges del fòrum amb valoració de <b>temps</b>, <b>satisfacció</b> i <b>si tornaria a donar</b> (1–5 estrelles).</p>
        </div>
      </aside>

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
