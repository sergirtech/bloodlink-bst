import Icon from '../components/Icon.jsx'
import { Card, Avatar } from '../components/ui.jsx'
import { DONOR } from '../data.js'

export default function Profile({ state, go, notify }) {
  const total = state.donations.length
  const volume = state.donations.reduce((a, d) => a + d.volume, 0)
  const count = (t) => state.donations.filter((d) => d.type === t).length
  const last = state.donations.length ? new Date(Math.max(...state.donations.map((d) => new Date(d.date)))) : new Date()

  return (
    <div className="content">
      <div className="carnet">
        <div className="row between">
          <span className="kicker light row gap8"><span className="carnet-ic"><Icon name="card" size={14} /></span> CARNET DIGITAL DE DONANT</span>
          <span className="carnet-id">#{DONOR.id}</span>
        </div>
        <div className="row gap14">
          <span className="carnet-avatar"><Avatar size={64} /><i><Icon name="check" size={11} color="#fff" stroke={3} /></i></span>
          <div>
            <h2 className="carnet-name">{DONOR.fullName}</h2>
            <span className="small row gap6 amber-light"><Icon name="medal" size={14} /> Nivell {DONOR.level} · {DONOR.levelName}</span>
          </div>
        </div>
        <div className="row gap10">
          <div className="carnet-group">
            <b>0−</b>
            <div><span>NEGATIU</span><span className="teal-light row gap4"><Icon name="globe" size={12} /> Donant Universal</span></div>
          </div>
          <span className="apt"><i /> Apte per donar avui</span>
        </div>
      </div>

      <Card className="point-row indigo-card" onClick={() => go('donate')}>
        <span className="iconbox ib-red"><Icon name="calendarPlus" size={20} /></span>
        <div className="grow"><b>Tens disponibilitat immediata</b><p className="small muted">Reserva torn al teu centre de referència</p></div>
        <Icon name="chev" color="#B70011" />
      </Card>

      <div className="row between">
        <h2 className="h-lg">Impacte acumulat</h2>
        <button className="link red kicker-btn" onClick={() => go('history')}>HISTORIAL ACTIU <Icon name="code" size={13} /></button>
      </div>
      <div className="stats">
        <Card className="center"><span className="iconbox ib-red round sm"><Icon name="dropFill" size={14} stroke={0} /></span><b className="stat">{total}</b><span className="xs strong">Donacions totals</span></Card>
        <Card className="center"><span className="iconbox ib-teal round sm"><Icon name="drop" size={14} /></span><b className="stat">{(volume / 1000).toFixed(1)}L</b><span className="xs strong">Volum donat</span></Card>
        <Card className="center"><span className="iconbox ib-amber round sm"><Icon name="heart" size={14} /></span><b className="stat red">~{total * 3}</b><span className="xs strong">Vides ajudades</span></Card>
      </div>

      <Card>
        <div className="row between"><b className="small">Distribució de donacions</b><span className="xs muted">Última: {last.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div className="dist">
          <i className="red-bg" style={{ flex: count('whole_blood') }} />
          <i className="amber-bg" style={{ flex: count('plasma') }} />
          <i className="teal-bg" style={{ flex: count('platelets') }} />
        </div>
        <div className="row gap14 xs strong">
          <span className="row gap4"><i className="dot red-bg" /> {count('whole_blood')} Sang</span>
          <span className="row gap4"><i className="dot amber-bg" /> {count('plasma')} Plasma</span>
          <span className="row gap4"><i className="dot teal-bg" /> {count('platelets')} Plaquetes</span>
        </div>
      </Card>

      <button className="export-cta" onClick={() => go('history')}>
        <span className="iconbox ib-indigo"><Icon name="code" size={20} /></span>
        <div className="grow"><b>Exportar registre de donacions</b><span>JSON compatible amb els sistemes del BST</span></div>
        <Icon name="download" size={20} color="#B70011" />
      </button>

      <div className="row between">
        <h2 className="h-lg">Dades personals</h2>
        <button className="link red small strong row gap4" onClick={() => notify('Edició de dades: properament')}><Icon name="pencil" size={14} /> Editar</button>
      </div>
      <Card className="list">
        {[
          ['mail', 'Correu electrònic', DONOR.email],
          ['phone', 'Telèfon mòbil', DONOR.phone],
          ['cake', 'Data de naixement', "14 d'agost de 1998 (28 anys)"],
          ['pin', 'Municipi / Zona habitual', `${DONOR.municipality} (${DONOR.district})`],
          ['building', 'Centre de donació de referència', DONOR.referenceCenter.name],
        ].map(([ic, l, v], i) => (
          <div className="list-row" key={l}>
            <span className={`iconbox ${i === 4 ? 'ib-red' : 'ib-indigo'}`}><Icon name={ic} size={18} /></span>
            <div><span className="xs strong muted">{l}</span><b>{v}</b></div>
          </div>
        ))}
      </Card>

      <button className="link red center strong row center-row gap8" onClick={() => go('login')}><Icon name="logout" size={18} /> Tancar sessió</button>
      <p className="xs muted center">Banc de Sang i Teixits de Catalunya · v2.4.1</p>
    </div>
  )
}
