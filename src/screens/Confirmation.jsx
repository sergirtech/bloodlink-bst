import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import JsonViewer from '../components/JsonViewer.jsx'
import { DONATION_TYPES, POINTS } from '../data.js'
import { fmtDateTime } from '../lib/dates.js'

export default function Confirmation({ state, update, go, notify }) {
  const appt = state.appointment
  if (!appt) {
    return (
      <div className="content center">
        <p className="muted">Encara no tens cap cita reservada.</p>
        <Button icon="calendar" onClick={() => go('donate')}>Reservar hora</Button>
      </div>
    )
  }
  const point = POINTS.find((p) => p.code === appt.pointCode)
  const type = DONATION_TYPES.find((t) => t.id === appt.typeId)

  return (
    <div className="content">
      <div className="row between">
        <span />
        <Chip tone="teal-soft">Pas 3 de 3</Chip>
      </div>
      <div className="done">
        <span className="done-ic"><Icon name="check" size={46} stroke={2.6} /></span>
        <h1 className="h-xl">Cita confirmada!</h1>
        <p className="muted">T'enviarem un recordatori per SMS i correu el dia abans.</p>
      </div>

      <Card>
        <div className="sum-row"><Icon name="calendar" size={18} color="#B70011" /><div><span className="xs muted">Data i hora</span><b>{fmtDateTime(appt.start)}</b></div></div>
        <div className="sum-row"><Icon name={type.icon} size={18} color="#B70011" /><div><span className="xs muted">Tipus de donació</span><b>{type.label} · ~{type.minutes} min</b></div></div>
        <div className="sum-row"><Icon name="pin" size={18} color="#B70011" /><div><span className="xs muted">Punt de donació</span><b>{point.name}</b><span className="xs muted">{point.address}</span></div></div>
        <div className="sum-row"><Icon name="code" size={18} color="#B70011" /><div><span className="xs muted">Codi de cita</span><b className="mono">{appt.id}</b></div></div>
      </Card>

      <div className="info indigo-soft row gap10 top">
        <Icon name="building" size={18} color="#3B4BA0" />
        <span className="small">Aquest registre s'envia al BST en format JSON estàndard perquè els seus sistemes actuals el puguin importar sense cap canvi manual.</span>
      </div>

      <JsonViewer data={appt.record} filename={`${appt.id}.json`} notify={notify} title="Registre de cita (JSON)" />

      <Button icon="dropFill" onClick={() => go('home')}>Tornar a l'inici</Button>
      <Button variant="ghost" icon="x" onClick={() => { update({ appointment: null }); notify('Cita cancel·lada'); go('home') }}>Cancel·lar la cita</Button>
    </div>
  )
}
