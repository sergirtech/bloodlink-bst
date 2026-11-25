import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import { DONOR, DONATION_TYPES, POINTS } from '../data.js'

// Mapa il·lustrat de Barcelona (sense dependències ni claus d'API)
function MiniMap({ selected, onSelect }) {
  const [zoom, setZoom] = useState(1)
  return (
    <div className="map">
      <div className="map-canvas" style={{ transform: `scale(${zoom})` }}>
        <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="map-bg">
          <rect width="100" height="70" fill="#E9EEF3" />
          <path d="M70 0 L100 0 L100 70 L88 70 C84 55 80 40 74 28 C72 18 70 8 70 0Z" fill="#B9DDF2" />
          <path d="M0 12 C20 8 30 18 40 14 S60 4 70 6" stroke="#fff" strokeWidth="2.2" fill="none" />
          <path d="M5 40 C25 36 45 44 65 30 S80 22 90 30" stroke="#fff" strokeWidth="2.8" fill="none" />
          <path d="M30 0 C34 20 38 40 34 70" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M55 0 C52 25 56 45 62 70" stroke="#fff" strokeWidth="1.6" fill="none" />
          <path d="M0 58 C20 55 40 62 70 52" stroke="#FCE7A8" strokeWidth="1.6" fill="none" />
          <circle cx="22" cy="22" r="7" fill="#D6EBD4" /><circle cx="44" cy="58" r="5" fill="#D6EBD4" />
        </svg>
        <span className="map-label" style={{ left: '52%', top: '36%' }}>Barcelona</span>
        <span className="map-label sm" style={{ left: '30%', top: '62%' }}>L'Hospitalet</span>
        <span className="map-label sm" style={{ left: '36%', top: '22%' }}>Les Corts</span>
        {POINTS.map((p) => (
          <button key={p.code} className={`map-pin ${selected === p.code ? 'on' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => onSelect(p.code)} aria-label={p.name}>
            <Icon name={p.icon} size={selected === p.code ? 20 : 16} />
            {selected === p.code && <span className="pin-tag">● Més proper · {p.distance}</span>}
          </button>
        ))}
        <span className="me" style={{ left: '42%', top: '52%' }} />
      </div>
      <div className="map-zoom">
        <button onClick={() => setZoom(Math.min(1.6, zoom + 0.2))} aria-label="Apropar"><Icon name="plus" size={18} /></button>
        <button onClick={() => setZoom(Math.max(1, zoom - 0.2))} aria-label="Allunyar"><Icon name="minus" size={18} /></button>
      </div>
      <span className="map-foot"><Icon name="arrowUp" size={12} color="#B70011" /> Punt més proper · 300 m</span>
    </div>
  )
}

export default function Donate({ state, update, go, notify }) {
  const [query, setQuery] = useState(`${DONOR.district} / ${DONOR.postalCode}, ${DONOR.municipality}`)
  const point = POINTS.find((p) => p.code === state.pointCode)

  return (
    <div className="content">
      <div>
        <h1 className="h-xl">Cerca el punt més proper</h1>
        <p className="muted">Indica la teva ubicació i el tipus de donació per calcular els punts actius més propers.</p>
      </div>

      <div className="panel-soft">
        <span className="field-label">Zona, municipi o codi postal</span>
        <div className="input white">
          <Icon name="pin" size={19} color="#B70011" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={() => { setQuery(`${DONOR.district} / ${DONOR.postalCode}, ${DONOR.municipality}`); notify('Ubicació actualitzada') }} aria-label="La meva ubicació">
            <Icon name="locate" size={20} color="#B70011" />
          </button>
        </div>
        <span className="field-label">Què vols donar?</span>
        <div className="types">
          {DONATION_TYPES.map((t) => (
            <button key={t.id} className={state.typeId === t.id ? 'on' : ''} onClick={() => update({ typeId: t.id })}>
              <Icon name={t.icon} size={17} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <MiniMap selected={state.pointCode} onSelect={(c) => update({ pointCode: c })} />

      <Card className="featured">
        <div className="row gap12 top">
          <span className="point-ic"><Icon name={point.icon} size={24} /><small>{point.kind === 'mobile_unit' ? 'MÒBIL' : 'FIX'}</small></span>
          <div className="grow">
            <h2 className="h-lg">{point.name}</h2>
            <Chip tone="teal">{point.distance}</Chip>
            <p className="muted small row gap6 top mt6"><Icon name="pin" size={15} /> {point.address}</p>
          </div>
        </div>
        <div className="divider" />
        <div className="row between small">
          <span className="teal strong row gap6"><i className="dot teal-bg" /> Obert avui · {point.hours}</span>
          <span className="muted row gap6"><Icon name="timer" size={15} /> Espera: {point.wait}</span>
        </div>
        <Button icon="calendar" small onClick={() => go('booking')}>Reservar hora aquí</Button>
      </Card>

      <div className="row between">
        <h2 className="h-lg">Altres punts propers</h2>
        <span className="muted small">{POINTS.length} disponibles</span>
      </div>
      {POINTS.map((p) => {
        const on = p.code === state.pointCode
        return (
          <Card key={p.code} className={`point-row ${on ? 'on' : ''}`} onClick={() => update({ pointCode: p.code })}>
            <span className={`iconbox ${on ? 'ib-solid' : 'ib-indigo'}`}><Icon name={p.icon} size={20} /></span>
            <div className="grow">
              <b>{p.name}</b>
              <p className="small muted row gap6"><Icon name="clock" size={14} color="#00655C" /> {p.hours.replace('h', '')}</p>
            </div>
            <div className="right-col">
              <Chip tone={on ? 'teal' : 'indigo'}>{p.distance}</Chip>
              <span className="red small strong">{on ? 'Seleccionat' : 'Triar'} ›</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
