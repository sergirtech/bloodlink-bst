import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import { DONOR, POINTS, DONATION_TYPES } from '../data.js'
import { fmtDateTime } from '../lib/dates.js'

// QR decoratiu amb la gota al centre (com al disseny)
export function DonorQR({ size = 168 }) {
  const n = 21
  const cells = []
  const isFinder = (x, y) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
  const center = (x, y) => x > 7 && x < 13 && y > 7 && y < 13
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!isFinder(x, y) && !center(x, y) && (x + y) % 2 === 0 && (x * 3 + y * 5) % 7 < 4)
      cells.push(<rect key={`${x}-${y}`} x={x + 0.1} y={y + 0.1} width=".8" height=".8" rx=".1" />)
  }
  const finder = (x, y) => (
    <g key={`f${x}${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="1.2" fill="none" stroke="#131B2E" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx=".5" />
    </g>
  )
  return (
    <svg viewBox="0 0 21 21" width={size} height={size} fill="#131B2E">
      {cells}{finder(0, 0)}{finder(14, 0)}{finder(0, 14)}
      <rect x="8" y="8" width="5" height="5" rx="1.2" fill="#B70011" />
      <path d="M10.5 9.1s-1.3 1.4-1.3 2.3a1.3 1.3 0 0 0 2.6 0c0-.9-1.3-2.3-1.3-2.3z" fill="#fff" />
    </svg>
  )
}

export default function Home({ state, go }) {
  const appt = state.appointment
  const point = appt && POINTS.find((p) => p.code === appt.pointCode)
  const type = appt && DONATION_TYPES.find((t) => t.id === appt.typeId)
  return (
    <div className="content">
      <div className="row between wrap gap8">
        <div className="row gap8">
          <h1 className="h-xl">Hola, {DONOR.firstName}</h1>
          <Chip tone="red">0− Negatiu</Chip>
        </div>
        <Chip tone="indigo" icon="flame">Nivell {DONOR.level}</Chip>
      </div>
      <div>
        <p className="lead">Has fet {state.donations.length} donacions (sang, plasma, plaquetes, teixits).</p>
        <p className="muted">El teu gest salva vides cada dia. Gràcies per ser-hi!</p>
      </div>

      <Button icon="dropFill" onClick={() => go('donate')}>Donar ara</Button>

      {appt && (
        <Card className="appt" onClick={() => go('confirm')}>
          <span className="iconbox ib-teal"><Icon name="calendar" size={20} /></span>
          <div className="grow">
            <span className="kicker teal">PROPERA CITA</span>
            <b>{fmtDateTime(appt.start)}</b>
            <p className="small muted">{type.label} · {point.name}</p>
          </div>
          <Icon name="chev" color="#5C403C" />
        </Card>
      )}

      <Card className="center qr-card">
        <h2 className="h-md">Ensenya el QR per donar</h2>
        <p className="muted small">Mostra aquest codi en arribar al punt de donació</p>
        <div className="qr-frame"><DonorQR /></div>
        <span className="kicker">ID DONANT: #{DONOR.id}</span>
      </Card>
    </div>
  )
}
