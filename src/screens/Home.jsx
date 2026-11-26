import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import QRCode from '../components/QRCode.jsx'
import { Button, Card, Chip } from '../components/ui.jsx'
import { CENTERS, DONATION_TYPES } from '../data.js'
import { qrPayload } from '../lib/db.js'
import { bloodLabel, levelInfo, nextEligibleDate } from '../lib/donor.js'
import { fmtDate, fmtDateTime } from '../lib/dates.js'

export default function Home({ state, donor, go }) {
  const [showJson, setShowJson] = useState(false)
  const appt = state.appointment
  const active = appt && ['scheduled', 'checked_in'].includes(appt.status)
  const point = active && CENTERS.find((p) => p.code === appt.pointCode)
  const type = active && DONATION_TYPES.find((t) => t.id === appt.typeId)
  const blood = bloodLabel(donor.bloodGroup)
  const { level } = levelInfo(state.donations)
  const next = nextEligibleDate(state.donations)
  const n = state.donations.length
  const payload = qrPayload(donor, appt)

  return (
    <div className="content">
      <div className="row between wrap gap8">
        <div className="row gap8">
          <h1 className="h-xl">Hola, {donor.firstName}</h1>
          <Chip tone={donor.bloodGroup ? 'red' : 'outline'}>{donor.bloodGroup ? `${blood.short} ${blood.long}` : 'Grup pendent'}</Chip>
        </div>
        <Chip tone="indigo" icon="flame">Nivell {level.n}</Chip>
      </div>
      <div>
        <p className="lead">{n === 0 ? 'Encara no tens cap donació registrada.' : `Has fet ${n} ${n === 1 ? 'donació' : 'donacions'} amb el BST.`}</p>
        <p className="muted">{n === 0 ? 'La teva primera donació pot ajudar fins a 3 persones.' : 'El teu gest salva vides cada dia. Gràcies per ser-hi!'}</p>
      </div>

      {next && !active
        ? <div className="info indigo-soft row gap10 top"><Icon name="clock" size={18} color="#3B4BA0" /><span className="small">Període de descans: podràs tornar a donar a partir del <b>{fmtDate(next)}</b>.</span></div>
        : !active && <Button icon="dropFill" onClick={() => go('donate')}>Donar ara</Button>}

      {active && (
        <Card className="appt" onClick={() => go('confirm')}>
          <span className="iconbox ib-teal"><Icon name="calendar" size={20} /></span>
          <div className="grow">
            <span className="kicker teal">{appt.status === 'checked_in' ? 'ARRIBADA REGISTRADA' : 'PROPERA CITA'}</span>
            <b>{fmtDateTime(appt.start)}</b>
            <p className="small muted">{type.label} · {point?.name}</p>
          </div>
          <Icon name="chev" color="#5C403C" />
        </Card>
      )}

      <Card className="center qr-card">
        <h2 className="h-md">Ensenya el QR per donar</h2>
        <p className="muted small">{active ? 'Inclou la teva cita: el personal la trobarà en escanejar-lo.' : 'Mostra aquest codi en arribar al punt de donació.'}</p>
        <div className="qr-frame"><QRCode value={payload} size={196} /></div>
        <span className="kicker">ID DONANT: #{donor.id}</span>
        <button className="link small strong row gap6 mt6" onClick={() => setShowJson(!showJson)}>
          <Icon name="code" size={14} /> {showJson ? 'Amagar el contingut' : 'Què conté el QR?'}
        </button>
        {showJson && (
          <>
            <pre className="qr-json">{JSON.stringify({ ...payload, token: '••••' + String(payload.token).slice(-4), appointment_token: payload.appointment_token && '••••' + String(payload.appointment_token).slice(-4) }, null, 2)}</pre>
            <p className="xs muted">Els tokens són secrets: només el personal del BST els pot validar. Si comparteixes el QR, el pots renovar des del perfil.</p>
          </>
        )}
      </Card>
    </div>
  )
}
