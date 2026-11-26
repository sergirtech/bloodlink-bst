import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import JsonViewer from '../components/JsonViewer.jsx'
import { DONATION_TYPES, CENTERS as POINTS } from '../data.js'
import { fmtDateTime } from '../lib/dates.js'
import QRCode from '../components/QRCode.jsx'
import { qrPayload } from '../lib/db.js'

const TITLE = { scheduled: 'Cita confirmada!', checked_in: 'Arribada registrada', completed: 'Donació feta. Gràcies!' }
const TEXT = {
  scheduled: "Tens el recordatori a la campana de l'app. En arribar, ensenya el QR al personal.",
  checked_in: "El personal del BST ja t'ha registrat. Aviat et cridaran.",
  completed: 'El BST ja ha registrat la teva donació. La trobaràs al teu historial.',
}

export default function Confirmation({ state, donor, api, update, go, notify, refresh }) {
  const appt = state.appointment
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!appt || ['cancelled', 'no_show'].includes(appt.status)) {
    return (
      <div className="content center">
        <p className="muted">Encara no tens cap cita reservada.</p>
        <Button icon="calendar" onClick={() => go('donate')}>Reservar hora</Button>
      </div>
    )
  }
  const cancel = async () => {
    setBusy(true)
    try {
      await api.cancelAppointment(appt.id)
      update({ appointment: null })
      await refresh()
      notify('Cita cancel·lada')
      go('home')
    } catch (e) {
      notify(e.message)
      setBusy(false)
    }
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
        <h1 className="h-xl">{TITLE[appt.status]}</h1>
        <p className="muted">{TEXT[appt.status]}</p>
      </div>

      <Card>
        <div className="sum-row"><Icon name="calendar" size={18} color="#B70011" /><div><span className="xs muted">Data i hora</span><b>{fmtDateTime(appt.start)}</b></div></div>
        <div className="sum-row"><Icon name={type.icon} size={18} color="#B70011" /><div><span className="xs muted">Tipus de donació</span><b>{type.label} · ~{type.minutes} min</b></div></div>
        <div className="sum-row"><Icon name="pin" size={18} color="#B70011" /><div><span className="xs muted">Punt de donació</span><b>{point.name}</b><span className="xs muted">{point.address}</span></div></div>
        <div className="sum-row"><Icon name="code" size={18} color="#B70011" /><div><span className="xs muted">Codi de cita</span><b className="mono">{appt.id}</b></div></div>
      </Card>

      {['scheduled', 'checked_in'].includes(appt.status) && (
        <Card className="center qr-card">
          <b>QR de la cita</b>
          <div className="qr-frame"><QRCode value={qrPayload(donor, appt)} size={170} /></div>
          <span className="xs muted">També el tens a la pantalla d'Inici</span>
        </Card>
      )}

      <div className="info indigo-soft row gap10 top">
        <Icon name="building" size={18} color="#3B4BA0" />
        <span className="small">Aquest registre s'envia al BST en format JSON estàndard perquè els seus sistemes actuals el puguin importar sense cap canvi manual.</span>
      </div>

      <JsonViewer data={appt.record} filename={`${appt.id}.json`} notify={notify} title="Registre de cita (JSON)" />

      <Button icon="dropFill" onClick={() => go('home')}>Tornar a l'inici</Button>
      {appt.status === 'scheduled' && (confirming ? (
        <div className="card form">
          <b>Segur que vols cancel·lar la cita?</b>
          <p className="small muted">La franja quedarà lliure per a un altre donant.</p>
          <Button variant="ghost" icon="x" disabled={busy} onClick={cancel}>{busy ? 'Cancel·lant…' : 'Sí, cancel·la-la'}</Button>
          <button className="link center small strong" onClick={() => setConfirming(false)}>No, mantenir-la</button>
        </div>
      ) : (
        <Button variant="ghost" icon="x" onClick={() => setConfirming(true)}>Cancel·lar la cita</Button>
      ))}
    </div>
  )
}
