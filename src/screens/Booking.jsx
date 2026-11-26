import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import { DONATION_TYPES, POINTS, isOpenNow } from '../data.js'
import { DAY_NAMES, MONTHS_CAP, fmtDate, fmtDateTime, nextDays } from '../lib/dates.js'
import { appointmentRecord } from '../lib/bstRecord.js'
import { emailOk, nextEligibleDate, phoneOk } from '../lib/donor.js'

const MORNING = ['09:30', '10:15', '11:45']
const AFTERNOON = ['16:30', '17:15', '18:00', '19:15']
const CAPACITY = 2 // donants per franja i punt (igual que a book_appointment)
const DAYS = 5

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() }
const isToday = (d) => d.toDateString() === new Date().toDateString()
const slotDate = (d, t) => { const x = new Date(d); x.setHours(Number(t.slice(0, 2)), Number(t.slice(3)), 0, 0); return x }

// Franges dins l'horari del punt
function slotsFor(point) {
  const m = point.hours.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/)
  const [open, close] = m ? [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]] : [0, 24 * 60]
  const ok = (t) => toMin(t) >= open && toMin(t) + 30 <= close
  return { morning: MORNING.filter(ok), afternoon: AFTERNOON.filter(ok) }
}

function dayLabel(d) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isToday(d)) return 'AVUI'
  if (d.toDateString() === tomorrow.toDateString()) return 'DEMÀ'
  return DAY_NAMES[d.getDay()].slice(0, 3).toUpperCase()
}

export default function Booking({ state, donor, api, update, go, notify, refresh }) {
  const point = POINTS.find((p) => p.code === state.pointCode)
  const type = DONATION_TYPES.find((t) => t.id === state.typeId)
  const { morning, afternoon } = slotsFor(point)
  const all = [...morning, ...afternoon]
  const eligibleFrom = nextEligibleDate(state.donations)
  const current = state.appointment && ['scheduled', 'checked_in'].includes(state.appointment.status) ? state.appointment : null

  // Dies amb alguna franja futura, a partir del dia que torna a poder donar
  const days = useMemo(() => {
    const isPast = (d, t) => isToday(d) && toMin(t) <= nowMin()
    return nextDays(DAYS + 1, eligibleFrom || new Date()).filter((d) => all.some((t) => !isPast(d, t))).slice(0, DAYS)
  }, [point.code, eligibleFrom?.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps

  const [day, setDay] = useState(0)
  const [time, setTime] = useState(null)
  const [usage, setUsage] = useState({})
  const [reload, setReload] = useState(0)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [contact, setContact] = useState({ name: donor.fullName, phone: donor.phone, email: donor.email })

  const d = days[day]
  const past = (t) => isToday(d) && toMin(t) <= nowMin()
  const full = (t) => (usage[slotDate(d, t).toISOString()] || 0) >= CAPACITY
  const free = (t) => !past(t) && !full(t)
  const available = all.filter(free).length

  // Places ocupades del dia triat (i en temps real quan algú reserva)
  useEffect(() => {
    if (!d) return
    let alive = true
    const load = async () => {
      const from = new Date(d); const to = new Date(d); to.setDate(to.getDate() + 1)
      try {
        const u = await api.slotUsage(point.code, from, to)
        if (alive) setUsage(u)
      } catch { /* si falla, la base de dades ho validarà en reservar */ }
      if (alive) setLoadingSlots(false)
    }
    setLoadingSlots(true)
    load()
    return () => { alive = false }
  }, [d?.getTime(), point.code, state.appointments, reload, api]) // eslint-disable-line react-hooks/exhaustive-deps

  // Si l'hora triada deixa d'estar lliure, es passa a la primera lliure
  useEffect(() => {
    if (!d || loadingSlots) return
    if (!time || !free(time)) setTime(all.find(free) || null)
  }, [day, usage, loadingSlots]) // eslint-disable-line react-hooks/exhaustive-deps

  const valid = contact.name.trim() && phoneOk(contact.phone) && emailOk(contact.email) && time && free(time)

  const confirm = async () => {
    const start = slotDate(d, time)
    const record = appointmentRecord({ donor, typeId: type.id, pointCode: point.code, start, contact })
    setSaving(true)
    setError(null)
    try {
      const appt = await api.bookAppointment({ typeId: type.id, pointCode: point.code, start, contact, record })
      update({ appointment: appt })
      await refresh()
      notify('Cita reservada')
      go('confirm')
    } catch (e) {
      setError(e.message)
      setReload((n) => n + 1) // torna a llegir la disponibilitat
    } finally {
      setSaving(false)
    }
  }

  if (current) {
    return (
      <div className="content">
        <button className="link strong row gap8" onClick={() => go('donate')}><Icon name="back" size={18} /> Tornar</button>
        <div className="info indigo-soft row gap10 top">
          <Icon name="calendar" size={18} color="#3B4BA0" />
          <span className="small">Ja tens una cita el <b>{fmtDateTime(current.start)}</b>. Per reservar-ne una altra, primer cancel·la aquesta.</span>
        </div>
        <Button icon="calendar" onClick={() => go('confirm')}>Veure la meva cita</Button>
      </div>
    )
  }

  const slotBtn = (t) => (
    <button key={t} disabled={!free(t)} className={time === t ? 'on' : ''} onClick={() => setTime(t)} title={full(t) ? 'Franja plena' : undefined}>
      {t}{full(t) && !past(t) && <small className="slot-full">Ple</small>}
    </button>
  )

  const field = (key, label, inputType = 'text', ok = true) => (
    <>
      <label className="field-label sm" htmlFor={key}>{label}</label>
      <div className={`input ${editing ? '' : 'readonly'} ${!ok ? 'invalid' : ''}`}>
        <input id={key} type={inputType} value={contact[key]} readOnly={!editing} onChange={(e) => setContact({ ...contact, [key]: e.target.value })} />
        {ok && <Icon name="checkCircle" size={19} color="#00655C" />}
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
            {isOpenNow(point.hours)
              ? <Chip tone="teal-soft"><i className="dot teal-bg" /> OBERT ARA</Chip>
              : <Chip tone="outline">TANCAT ARA · {point.hours}</Chip>}
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

      {eligibleFrom && (
        <div className="info indigo-soft row gap10 top">
          <Icon name="clock" size={18} color="#3B4BA0" />
          <span className="small">Per la teva última donació, pots tornar a donar a partir del <b>{fmtDate(eligibleFrom)}</b>. Et mostrem dies a partir d'aleshores.</span>
        </div>
      )}

      <div className="row between">
        <h3 className="h-md row gap8"><Icon name="calendar" size={19} color="#B70011" /> Tria el dia</h3>
        {d && <Chip tone="outline">{MONTHS_CAP[d.getMonth()]} {d.getFullYear()}</Chip>}
      </div>
      <div className="days five">
        {days.map((x, i) => (
          <button key={x.toISOString()} className={day === i ? 'on' : ''} onClick={() => setDay(i)}>
            <span>{dayLabel(x)}</span><b>{x.getDate()}</b><span>{DAY_NAMES[x.getDay()].slice(0, 3)}</span>
          </button>
        ))}
      </div>

      <div className="row between">
        <h3 className="h-md row gap8"><Icon name="clock" size={19} color="#B70011" /> Franges horàries</h3>
        <Chip tone={available ? 'red-outline' : 'outline'}>{loadingSlots ? 'Comprovant…' : `${available} disponibles`}</Chip>
      </div>
      {morning.length > 0 && <>
        <span className="kicker amber row gap6"><Icon name="sun" size={15} /> TORN DE MATÍ</span>
        <div className="slots three">{morning.map(slotBtn)}</div>
      </>}
      {afternoon.length > 0 && <>
        <span className="kicker amber row gap6"><Icon name="sunset" size={15} /> TORN DE TARDA</span>
        <div className="slots four">{afternoon.map(slotBtn)}</div>
      </>}
      {!loadingSlots && available === 0 && <p className="center small red">No queden places aquest dia. Tria'n un altre.</p>}

      <Card className="form">
        <h3 className="h-md row gap8"><Icon name="user" size={19} color="#B70011" /> Dades de confirmació</h3>
        {field('name', 'Nom del donant', 'text', Boolean(contact.name.trim()))}
        {field('phone', 'Telèfon mòbil (per avisar-te si hi ha canvis)', 'tel', phoneOk(contact.phone))}
        {field('email', 'Correu electrònic', 'email', emailOk(contact.email))}
        <div className="info teal-soft row gap10 top">
          <Icon name="qr" size={18} color="#00655C" />
          <span className="small">En arribar, ensenya el QR de la pantalla d'Inici: inclourà aquesta cita.</span>
        </div>
      </Card>

      <button className="link center small row center-row gap6" onClick={() => setEditing(!editing)}>
        <Icon name={editing ? 'check' : 'pencil'} size={15} /> {editing ? 'Fet' : 'Hi ha alguna dada incorrecta? Edita-les'}
      </button>

      {error && <p className="form-error" role="alert"><Icon name="alert" size={15} /> {error}</p>}
      <Button icon="calendarPlus" onClick={confirm} disabled={!valid || saving}>{saving ? 'Reservant…' : "Confirmar Reserva d'Hora"}</Button>
      <p className="center small muted">Pots cancel·lar la cita en qualsevol moment sense cost.</p>
    </div>
  )
}
