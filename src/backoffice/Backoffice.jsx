import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Chip, Stars } from '../components/ui.jsx'
import JsonViewer from '../components/JsonViewer.jsx'
import { CENTERS, DONATION_TYPES, ZONES, RATING_FIELDS } from '../data.js'
import { staffApi as api } from '../lib/db.js'
import { donationHistoryRecord } from '../lib/bstRecord.js'
import { fmtDateTime, fmtDate, timeAgo } from '../lib/dates.js'
import Scanner from './Scanner.jsx'

const NAV = [
  ['summary', 'medal', 'Resum'],
  ['scan', 'qr', 'Escàner QR'],
  ['appointments', 'calendar', 'Cites'],
  ['donations', 'dropFill', 'Donacions'],
  ['ratings', 'star', 'Valoracions'],
]
export const STATUS = {
  scheduled: ['Programada', 'indigo'], checked_in: ['Arribat', 'teal-soft'], completed: ['Feta', 'teal'],
  cancelled: ['Cancel·lada', 'outline'], no_show: ['No presentat', 'red'],
}
export const TYPE = Object.fromEntries(DONATION_TYPES.map((t) => [t.id, t]))
export const CENTER = Object.fromEntries(CENTERS.map((c) => [c.code, c]))
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const isNew = (iso) => iso && Date.now() - new Date(iso) < 5 * 60000

/* ───────── Accés: només personal del BST ───────── */
export default function Backoffice() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    api.getSession().then((s) => setSession(s ?? null))
    return api.onAuthChange((_e, s) => setSession(s ?? null))
  }, [])
  // DEMO: qualsevol compte amb sessió pot entrar al backoffice (no es comprova la taula staff)
  if (session === undefined) return <div className="bo-gate"><span className="spinner" /></div>
  if (!session) return <StaffLogin />
  return <BackofficeApp staff={{ full_name: 'Personal BST' }} email={session.user.email} />
}

function StaffLogin() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try { await api.signIn(email, pass) } catch (err) { setError(err.message); setBusy(false) }
  }
  return (
    <div className="bo-gate">
      <form className="bo-card bo-login" onSubmit={submit}>
        <div className="bo-logo">
          <span className="logo"><Icon name="dropFill" size={18} color="#fff" stroke={0} /></span>
          <div><b>BST Backoffice</b><span>Mode demo: qualsevol correu i contrasenya</span></div>
        </div>
        <label className="bo-field">Correu<input type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="bo-field">Contrasenya<input type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} required /></label>
        {error && <p className="form-error"><Icon name="alert" size={15} /> {error}</p>}
        <button className="bo-btn primary big" disabled={busy}>{busy ? 'Entrant…' : 'Entrar'}</button>
        <a className="small muted" href="#/">← Anar a l'app del donant</a>
      </form>
    </div>
  )
}

function BackofficeApp({ staff, email }) {
  const [page, setPage] = useState('summary')
  const [zone, setZone] = useState('all')
  const [data, setData] = useState({ appointments: [], donations: [], posts: [], loading: true, error: null })
  const [updatedAt, setUpdatedAt] = useState(null)
  const [toast, setToast] = useState(null)

  const notify = (m) => { setToast(m); clearTimeout(window.__bt); window.__bt = setTimeout(() => setToast(null), 2800) }

  const load = useCallback(async () => {
    try {
      const [appointments, donations, posts] = await Promise.all([api.listAppointments(), api.listDonations(), api.listPosts()])
      setData({ appointments, donations, posts, loading: false, error: null })
      setUpdatedAt(new Date())
    } catch (e) {
      setData((d) => ({ ...d, loading: false, error: e.message }))
    }
  }, [])
  useEffect(() => { load(); return api.subscribe(load) }, [load])

  // Filtre per zona geogràfica aplicat a totes les seccions
  const inZone = (code) => zone === 'all' || CENTER[code]?.zone === zone
  const f = useMemo(() => ({
    appointments: data.appointments.filter((a) => inZone(a.pointCode)),
    donations: data.donations.filter((d) => inZone(d.center)),
    posts: data.posts.filter((p) => zone === 'all' || p.zone === zone),
  }), [data, zone]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = data.appointments.filter((a) => a.status === 'scheduled' || a.status === 'checked_in').length
  const props = { f, notify, setPage, reload: load }
  return (
    <div className="bo">
      <aside className="bo-side">
        <div className="bo-logo">
          <span className="logo"><Icon name="dropFill" size={18} color="#fff" stroke={0} /></span>
          <div><b>BST Backoffice</b><span>Banc de Sang i Teixits</span></div>
        </div>
        <nav>
          {NAV.map(([id, ic, l]) => (
            <button key={id} className={page === id ? 'on' : ''} onClick={() => setPage(id)}>
              <Icon name={ic} size={18} stroke={ic === 'dropFill' ? 0 : 2} /> {l}
              {id === 'appointments' && pending > 0 && <span className="bo-count">{pending}</span>}
            </button>
          ))}
        </nav>
        <span className="grow" />
        <div className="bo-status">
          <b><i className="live supabase" /> Temps real</b>
          <span>{staff.full_name} · {email}</span>
          {updatedAt && <span>Actualitzat a les {updatedAt.toLocaleTimeString('ca-ES')}</span>}
          <button onClick={() => api.signOut()}>Tancar sessió</button>
        </div>
        <a className="bo-app-link" href="#/" target="_blank" rel="noreferrer"><Icon name="phone" size={16} /> Obrir l'app del donant</a>
      </aside>

      <main className="bo-main">
        <header className="bo-head">
          <div>
            <h1>{NAV.find((n) => n[0] === page)[2]}</h1>
            <p>{page === 'scan' ? "Escaneja el QR del donant per registrar l'arribada i la donació" : "Dades generades per l'app BST, sense introducció manual"}</p>
          </div>
          <span className="grow" />
          {page !== 'scan' && (
            <label className="bo-select">
              <Icon name="pin" size={15} />
              <select value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="all">Totes les zones</option>
                {ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            </label>
          )}
        </header>
        {data.error && <div className="db-error">No s'ha pogut llegir la base de dades: {data.error}</div>}
        {data.loading ? <p className="muted">Carregant dades…</p> : (
          <>
            {page === 'summary' && <Summary {...props} />}
            {page === 'scan' && <Scanner api={api} notify={notify} reload={load} appointments={data.appointments} />}
            {page === 'appointments' && <Appointments {...props} />}
            {page === 'donations' && <Donations {...props} />}
            {page === 'ratings' && <Ratings {...props} />}
          </>
        )}
      </main>
      {toast && <div className="toast bo-toast"><Icon name="check" size={16} /> {toast}</div>}
    </div>
  )
}

const Kpi = ({ label, value, note, tone = 'indigo' }) => (
  <div className="bo-card kpi"><span>{label}</span><b>{value}</b>{note && <Chip tone={tone}>{note}</Chip>}</div>
)

/* ───────── Resum ───────── */
function Summary({ f, setPage }) {
  const upcoming = f.appointments.filter((a) => a.status === 'scheduled' && new Date(a.start) > new Date())
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = f.donations.filter((d) => d.date.slice(0, 7) === month)
  const rated = f.posts.filter((p) => p.ratings)
  const sat = avg(rated.map((p) => p.ratings.satisfaction))
  const again = rated.length ? rated.filter((p) => p.ratings.again >= 4).length / rated.length : null
  const byType = DONATION_TYPES.map((t) => [t, f.donations.filter((d) => d.type === t.id).length])
  const maxT = Math.max(1, ...byType.map(([, n]) => n))
  const recent = [...f.appointments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)

  return (
    <>
      <div className="bo-kpis">
        <Kpi label="Cites programades" value={upcoming.length} note="properes" />
        <Kpi label="Donacions aquest mes" value={thisMonth.length} note={`${thisMonth.reduce((a, d) => a + (d.volume || 0), 0)} ml`} tone="teal-soft" />
        <Kpi label="Donacions registrades" value={f.donations.length} note="historial total" />
        <Kpi label="Satisfacció mitjana" value={sat ? `${sat.toFixed(1)} / 5` : '—'} note={`${rated.length} valoracions`} tone="teal-soft" />
        <Kpi label="Tornaria a donar" value={again != null ? `${Math.round(again * 100)} %` : '—'} note="valoració ≥ 4" tone={again >= 0.8 ? 'teal-soft' : 'red'} />
      </div>
      <div className="bo-cols">
        <section className="bo-card grow">
          <div className="bo-card-head"><h2>Últimes reserves des de l'app</h2><button className="link red small strong" onClick={() => setPage('appointments')}>Veure totes ›</button></div>
          {recent.length === 0 && <Empty text="Encara no hi ha cites. Reserva'n una des de l'app i apareixerà aquí." />}
          {recent.map((a) => (
            <div className="bo-row" key={a.id}>
              <span className="iconbox ib-red sm"><Icon name={TYPE[a.typeId].icon} size={15} /></span>
              <div className="grow"><b>{a.donorName}</b><span>{TYPE[a.typeId].label} · {CENTER[a.pointCode]?.name}</span></div>
              <span className="small">{fmtDateTime(a.start)}</span>
              {isNew(a.createdAt) && <Chip tone="red">Nova</Chip>}
              <Chip tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Chip>
            </div>
          ))}
        </section>
        <section className="bo-card side">
          <div className="bo-card-head"><h2>Donacions per tipus</h2></div>
          {byType.map(([t, n]) => (
            <div className="bo-bar" key={t.id}>
              <span>{t.label}</span>
              <div><i style={{ width: `${(n / maxT) * 100}%` }} /></div>
              <b>{n}</b>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

/* ───────── Cites ───────── */
function Appointments({ f, notify, reload }) {
  const [status, setStatus] = useState('scheduled')
  const [busy, setBusy] = useState(null)
  const [json, setJson] = useState(null)
  const rows = f.appointments.filter((a) => status === 'all' || a.status === status)

  const act = async (a, fn, msg) => {
    setBusy(a.id)
    try { await fn(); notify(msg); reload() } catch (e) { notify(`Error: ${e.message}`) } finally { setBusy(null) }
  }

  return (
    <section className="bo-card">
      <div className="bo-card-head">
        <h2>Cites reservades</h2>
        <div className="chips">
          {[['scheduled', 'Programades'], ['checked_in', 'Arribats'], ['completed', 'Fetes'], ['no_show', 'No presentats'], ['cancelled', 'Cancel·lades'], ['all', 'Totes']].map(([k, l]) => (
            <Chip key={k} tone="pill" active={status === k} onClick={() => setStatus(k)}>{l}</Chip>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <Empty text="No hi ha cites amb aquest estat." /> : (
        <table className="bo-table">
          <thead><tr><th>Cita</th><th>Donant</th><th>Tipus</th><th>Punt</th><th>Data i hora</th><th>Estat</th><th /></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className={isNew(a.createdAt) ? 'fresh' : ''}>
                <td className="mono small">{a.id}</td>
                <td><b>{a.donorName}</b><span className="sub">{a.phone}</span></td>
                <td>{TYPE[a.typeId].label}</td>
                <td>{CENTER[a.pointCode]?.name}</td>
                <td>{fmtDateTime(a.start)}</td>
                <td><Chip tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Chip></td>
                <td className="actions">
                  {a.status === 'scheduled' && <button className="bo-btn" disabled={busy === a.id} onClick={() => act(a, () => api.checkIn(a.id), 'Arribada registrada')}>Arribat</button>}
                  {['scheduled', 'checked_in'].includes(a.status) && <>
                    <button className="bo-btn primary" disabled={busy === a.id} onClick={() => act(a, () => api.completeAppointment(a.id), 'Donació registrada')}><Icon name="check" size={14} /> Marcar feta</button>
                    <button className="bo-btn" disabled={busy === a.id} onClick={() => act(a, () => api.setAppointmentStatus(a.id, 'no_show'), 'Marcada com a no presentat')}>No presentat</button>
                  </>}
                  <button className="bo-btn" onClick={() => setJson(json?.id === a.id ? null : a)}><Icon name="code" size={14} /> JSON</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {json && json.record && <JsonViewer data={json.record} filename={`${json.id}.json`} notify={notify} title={`Registre ${json.id}`} collapsedLines={20} />}
    </section>
  )
}

/* ───────── Donacions ───────── */
function Donations({ f, notify }) {
  const record = useMemo(() => donationHistoryRecord(f.donations), [f.donations])
  return (
    <div className="bo-cols">
      <section className="bo-card grow">
        <div className="bo-card-head"><h2>Donacions registrades</h2><span className="muted small">{f.donations.length} registres</span></div>
        {f.donations.length === 0 ? <Empty text="No hi ha donacions en aquesta zona." /> : (
          <table className="bo-table">
            <thead><tr><th>Donació</th><th>Data</th><th>Tipus</th><th>Volum</th><th>Punt</th><th>Cita</th></tr></thead>
            <tbody>
              {f.donations.map((d) => (
                <tr key={d.id} className={isNew(d.date) ? 'fresh' : ''}>
                  <td className="mono small">{d.id}</td>
                  <td>{fmtDate(new Date(d.date))}</td>
                  <td>{TYPE[d.type].label}</td>
                  <td>{d.volume ? `${d.volume} ml` : '—'}</td>
                  <td>{CENTER[d.center]?.name || d.center}</td>
                  <td className="mono small">{d.appointmentId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="side">
        <div className="bo-card">
          <h2>Exportació per als sistemes del BST</h2>
          <p className="small muted">Fitxer JSON en format «donation_history» v1.0, validat amb l'esquema documentat. Es pot importar o consultar per API.</p>
        </div>
        <JsonViewer data={record} filename={`bst-donacions-${new Date().toISOString().slice(0, 10)}.json`} notify={notify} title="donation_history.json" collapsedLines={18} />
      </section>
    </div>
  )
}

/* ───────── Valoracions ───────── */
function Ratings({ f }) {
  const rated = f.posts.filter((p) => p.ratings)
  const byCenter = CENTERS.map((c) => {
    const ps = rated.filter((p) => p.centerCode === c.code)
    return { c, n: ps.length, ...Object.fromEntries(RATING_FIELDS.map((r) => [r.key, avg(ps.map((p) => p.ratings[r.key]))])) }
  }).filter((r) => r.n > 0).sort((a, b) => a.time - b.time)
  const global = Object.fromEntries(RATING_FIELDS.map((r) => [r.key, avg(rated.map((p) => p.ratings[r.key]))]))
  const worst = byCenter[0]

  return (
    <>
      <div className="bo-kpis three">
        {RATING_FIELDS.map((r) => (
          <div className="bo-card kpi" key={r.key}>
            <span>{r.label}</span>
            <b>{global[r.key] ? global[r.key].toFixed(1) : '—'}<small> / 5</small></b>
            <Stars value={Math.round(global[r.key] || 0)} size={16} />
          </div>
        ))}
      </div>
      {worst && worst.time && worst.time < 3 && (
        <div className="bo-alert"><Icon name="clock" size={18} /> <span><b>{worst.c.name}</b> té la pitjor valoració de temps ({worst.time.toFixed(1)} / 5). Pot valer la pena reforçar personal o obrir més franges.</span></div>
      )}
      <div className="bo-cols">
        <section className="bo-card grow">
          <div className="bo-card-head"><h2>Valoració per punt de donació</h2><span className="muted small">{rated.length} valoracions</span></div>
          {byCenter.length === 0 ? <Empty text="Encara no hi ha valoracions en aquesta zona." /> : (
            <table className="bo-table">
              <thead><tr><th>Punt</th><th>Valoracions</th>{RATING_FIELDS.map((r) => <th key={r.key}>{r.label}</th>)}</tr></thead>
              <tbody>
                {byCenter.map((r) => (
                  <tr key={r.c.code}>
                    <td><b>{r.c.name}</b><span className="sub">{r.c.zone}</span></td>
                    <td>{r.n}</td>
                    {RATING_FIELDS.map((f2) => (
                      <td key={f2.key}><span className={`score ${r[f2.key] < 3 ? 'bad' : r[f2.key] >= 4.5 ? 'good' : ''}`}>{r[f2.key].toFixed(1)}</span> <Stars value={Math.round(r[f2.key])} size={11} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="bo-card side">
          <div className="bo-card-head"><h2>Últimes experiències</h2></div>
          {rated.slice(0, 6).map((p) => (
            <div className="bo-post" key={p.id}>
              <div className="row between"><b>{p.author}</b><span className="xs muted">{timeAgo(p.minutesAgo)}</span></div>
              <span className="xs teal-dark">{CENTER[p.centerCode]?.name || p.place}</span>
              <p className="small">{p.text}</p>
              <div className="row gap12 xs muted">{RATING_FIELDS.map((r) => <span key={r.key} className="row gap4">{r.label} <b className="ink">{p.ratings[r.key]}</b></span>)}</div>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

const Empty = ({ text }) => <div className="bo-empty"><Icon name="history" size={22} /> {text}</div>
