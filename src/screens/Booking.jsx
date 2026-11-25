import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import { DONOR, DONATION_TYPES, POINTS } from '../data.js'
import { DAY_NAMES, MONTHS_CAP, nextDays } from '../lib/dates.js'
import { appointmentRecord } from '../lib/bstRecord.js'
import { createAppointment } from '../lib/db.js'

const MORNING = ['09:30', '10:15', '11:45']
const AFTERNOON = ['16:30', '17:15', '18:00', '19:15']
const LABELS = ['AVUI', 'DEMÀ', 'PROPER']

export default function Booking({ state, update, go, notify }) {
  const point = POINTS.find((p) => p.code === state.pointCode)
  const type = DONATION_TYPES.find((t) => t.id === state.typeId)
  const days = nextDays(3)
  const [day, setDay] = useState(0)
  const [time, setTime] = useState('10:15')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contact, setContact] = useState({ name: DONOR.fullName, phone: DONOR.phone, email: DONOR.email })

  // Avui no es poden triar hores ja passades
  const now = new Date()
  const past = (t) => day === 0 && Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) <= now.getHours() * 60 + now.getMinutes()
  const available = [...MORNING, ...AFTERNOON].filter((t) => !past(t)).length
  const valid = contact.name.trim() && /^\+?[\d\s]{9,}$/.test(contact.phone) && /\S+@\S+\.\S+/.test(contact.email) && !past(time)

  const confirm = async () => {
    const start = new Date(days[day])
    start.setHours(Number(time.slice(0, 2)), Number(time.slice(3)))
    const appointmentId = `CITA-${start.getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`
    const record = appointmentRecord({ appointmentId, typeId: type.id, pointCode: point.code, start, contact })
    setSaving(true)
    try {
      const appt = await createAppointment({
        id: appointmentId, donorId: DONOR.id, donorName: contact.name, phone: contact.phone, email: contact.email,
        typeId: type.id, pointCode: point.code, start: start.toISOString(), status: 'scheduled', record,
      })
      update({ appointment: appt })
      go('confirm')
    } catch (e) {
      notify(`Error en desar la cita: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, type = 'text') => (
    <>
      <label className="field-label sm" htmlFor={key}>{label}</label>
      <div className={`input ${editing ? '' : 'readonly'}`}>
        <input id={key} type={type} value={contact[key]} readOnly={!editing} onChange={(e) => setContact({ ...contact, [key]: e.target.value })} />
        {key === 'name' && <Icon name="checkCircle" size={19} color="#00655C" />}
      </div>
    </>
  )

  return (
    <div className="content">
      <div className="row between">
        <button className="link strong row gap8" onClick={() => go('donate')}><Icon name="back" size={18} /> Canviar de punt</button>
        <Chip tone="red">Pas 2 de 3</Chip>
      </div>

      <Card>
        <div className="row between top">
          <div className="grow">
            <Chip tone="teal-soft"><i className="dot teal-bg" /> OBERT ARA</Chip>
            <h2 className="h-lg mt6">{point.name}</h2>
            <p className="small muted row gap6 top"><Icon name="pin" size={14} color="#B70011" /> {point.address}</p>
          </div>
          <span className="iconbox ib-red"><Icon name={point.icon} size={22} /></span>
        </div>
        <div className="mini-panel row gap10">
          <span className="iconbox ib-red sm"><Icon name={type.icon} size={16} /></span>
          <div className="grow"><b className="small">Donació de {type.label}</b><p className="xs muted">Temps estimat: ~{type.minutes} minuts</p></div>
          <button className="link red small strong" onClick={() => go('donate')}>Canviar</button>
        </div>
      </Card>

      <div className="row between">
        <h3 className="h-md row gap8"><Icon name="calendar" size={19} color="#B70011" /> Tria el dia</h3>
        <Chip tone="outline">{MONTHS_CAP[days[day].getMonth()]} {days[day].getFullYear()}</Chip>
      </div>
      <div className="days">
        {days.map((d, i) => (
          <button key={i} className={day === i ? 'on' : ''} onClick={() => setDay(i)}>
            <span>{LABELS[i]}</span><b>{d.getDate()}</b><span>{DAY_NAMES[d.getDay()]}</span>
          </button>
        ))}
      </div>

      <div className="row between">
        <h3 className="h-md row gap8"><Icon name="clock" size={19} color="#B70011" /> Franges horàries</h3>
        <Chip tone="red-outline">{available} disponibles</Chip>
      </div>
      <span className="kicker amber row gap6"><Icon name="sun" size={15} /> TORN DE MATÍ</span>
      <div className="slots three">
        {MORNING.map((t) => <button key={t} disabled={past(t)} className={time === t ? 'on' : ''} onClick={() => setTime(t)}>{t}</button>)}
      </div>
      <span className="kicker amber row gap6"><Icon name="sunset" size={15} /> TORN DE TARDA</span>
      <div className="slots four">
        {AFTERNOON.map((t) => <button key={t} disabled={past(t)} className={time === t ? 'on' : ''} onClick={() => setTime(t)}>{t}</button>)}
      </div>

      <Card className="form">
        <h3 className="h-md row gap8"><Icon name="user" size={19} color="#B70011" /> Dades de confirmació</h3>
        {field('name', 'Nom del donant')}
        {field('phone', 'Telèfon mòbil (Recordatori SMS i cita)', 'tel')}
        {field('email', 'Correu electrònic', 'email')}
        <div className="info teal-soft row gap10 top">
          <Icon name="shield" size={18} color="#00655C" />
          <span className="small">Recorda ensenyar el QR que tens en Inici (primer botó de la part inferior de l'aplicació)</span>
        </div>
      </Card>

      <button className="link center small row center-row gap6" onClick={() => setEditing(!editing)}>
        <Icon name={editing ? 'check' : 'pencil'} size={15} /> {editing ? 'Fet, guardar les dades' : 'Hi ha alguna dada incorrecte? Edita-les'}
      </button>

      <Button icon="calendarPlus" onClick={confirm} disabled={!valid || saving}>{saving ? 'Desant…' : "Confirmar Reserva d'Hora"}</Button>
      {past(time) && <p className="center small red">Aquesta hora ja ha passat. Tria'n una altra.</p>}
      <p className="center small muted">Pots modificar o cancel·lar la teva cita en qualsevol moment sense cost.</p>
    </div>
  )
}
