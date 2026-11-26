import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import { DONATION_TYPES, POINTS, distanceKm, fmtKm, isOpenNow } from '../data.js'

// Mapa il·lustrat de Barcelona (sense dependències ni claus d'API)
function MiniMap({ selected, onSelect, dist, nearest }) {
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
            {selected === p.code && <span className="pin-tag">● {p.code === nearest ? 'Més proper' : 'Seleccionat'} · {dist(p)}</span>}
          </button>
        ))}
        <span className="me" style={{ left: '42%', top: '52%' }} />
      </div>
      <div className="map-zoom">
        <button onClick={() => setZoom(Math.min(1.6, zoom + 0.2))} aria-label="Apropar"><Icon name="plus" size={18} /></button>
        <button onClick={() => setZoom(Math.max(1, zoom - 0.2))} aria-label="Allunyar"><Icon name="minus" size={18} /></button>
      </div>
      <span className="map-foot"><Icon name="arrowUp" size={12} color="#B70011" /> Punt més proper · {dist(POINTS.find((p) => p.code === nearest))}</span>
    </div>
  )
}

const norm = (t) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function Donate({ state, donor, update, go, notify }) {
  const home = [donor.district, donor.postalCode, donor.municipality].filter(Boolean).join(', ')
  const [query, setQuery] = useState(home)
  const [me, setMe] = useState(null) // { lat, lng } si el donant comparteix la ubicació
  const [locating, setLocating] = useState(false)
  const point = POINTS.find((p) => p.code === state.pointCode)

  // Distància real si hi ha ubicació; si no, l'estimada des del campus
  const km = (p) => (me ? distanceKm(me, p) : parseFloat(p.distance) / (p.distance.endsWith(' m') ? 1000 : 1))
  const dist = (p) => (p ? fmtKm(km(p)) : '')

  // Filtre per text: nom, adreça, zona o codi postal. Si no coincideix res, es mostren tots.
  const list = useMemo(() => {
    const words = norm(query).split(/[\s,/]+/).filter((w) => w.length > 2)
    const match = (p) => words.some((w) => norm(`${p.name} ${p.address} ${p.zone}`).includes(w))
    const found = words.length ? POINTS.filter(match) : POINTS
    return [...(found.length ? found : POINTS)].sort((a, b) => km(a) - km(b))
  }, [query, me]) // eslint-disable-line react-hooks/exhaustive-deps
  const nearest = list[0]?.code

  const locate = () => {
    if (!navigator.geolocation) return notify('El navegador no permet la ubicació')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMe(here)
        setQuery('La meva ubicació')
        const closest = [...POINTS].sort((a, b) => distanceKm(here, a) - distanceKm(here, b))[0]
        update({ pointCode: closest.code })
        setLocating(false)
        notify(`Punt més proper: ${closest.name}`)
      },
      () => { setLocating(false); notify("No s'ha pogut obtenir la ubicació") },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

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
          <input value={query} onChange={(e) => { setQuery(e.target.value); setMe(null) }} placeholder="Ex.: 08028, Les Corts, Girona" />
          <button onClick={locate} disabled={locating} aria-label="Fer servir la meva ubicació">
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

      <MiniMap selected={state.pointCode} onSelect={(c) => update({ pointCode: c })} dist={dist} nearest={nearest} />

      <Card className="featured">
        <div className="row gap12 top">
          <span className="point-ic"><Icon name={point.icon} size={24} /><small>{point.kind === 'mobile_unit' ? 'MÒBIL' : 'FIX'}</small></span>
          <div className="grow">
            <h2 className="h-lg">{point.name}</h2>
            <Chip tone="teal">{dist(point)}</Chip>
            <p className="muted small row gap6 top mt6"><Icon name="pin" size={15} /> {point.address}</p>
          </div>
        </div>
        <div className="divider" />
        <div className="row between small">
          {isOpenNow(point.hours)
            ? <span className="teal strong row gap6"><i className="dot teal-bg" /> Obert ara · {point.hours}</span>
            : <span className="muted strong row gap6"><i className="dot" /> Tancat ara · {point.hours}</span>}
          <span className="muted row gap6"><Icon name="timer" size={15} /> Espera habitual: {point.wait}</span>
        </div>
        <Button icon="calendar" small onClick={() => go('booking')}>Reservar hora aquí</Button>
      </Card>

      <div className="row between">
        <h2 className="h-lg">Altres punts propers</h2>
        <span className="muted small">{list.length} {list.length === 1 ? 'resultat' : 'disponibles'}</span>
      </div>
      {list.map((p) => {
        const on = p.code === state.pointCode
        return (
          <Card key={p.code} className={`point-row ${on ? 'on' : ''}`} onClick={() => update({ pointCode: p.code })}>
            <span className={`iconbox ${on ? 'ib-solid' : 'ib-indigo'}`}><Icon name={p.icon} size={20} /></span>
            <div className="grow">
              <b>{p.name}</b>
              <p className="small muted row gap6"><Icon name="clock" size={14} color="#00655C" /> {p.hours.replace('h', '')}</p>
            </div>
            <div className="right-col">
              <Chip tone={on ? 'teal' : 'indigo'}>{dist(p)}</Chip>
              <span className="red small strong">{on ? 'Seleccionat' : 'Triar'} ›</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
