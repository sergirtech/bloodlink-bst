import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Avatar } from '../components/ui.jsx'
import { CENTERS, ZONES } from '../data.js'
import { BLOOD_GROUPS, age, bloodLabel, levelInfo, nextEligibleDate, phoneOk, postalOk } from '../lib/donor.js'
import { fmtDate } from '../lib/dates.js'

export default function Profile({ state, donor, api, go, notify, refresh, signOut }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(donor)
  const [saving, setSaving] = useState(false)
  const [rotating, setRotating] = useState(false)

  const total = state.donations.length
  const volume = state.donations.reduce((a, d) => a + (d.volume || 0), 0)
  const count = (t) => state.donations.filter((d) => d.type === t).length
  const last = total ? new Date(Math.max(...state.donations.map((d) => new Date(d.date)))) : null
  const blood = bloodLabel(donor.bloodGroup)
  const { level } = levelInfo(state.donations)
  const next = nextEligibleDate(state.donations)
  const center = CENTERS.find((c) => c.code === donor.referenceCenterCode)
  const years = age(donor.birthDate)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const errors = {
    fullName: !form.fullName?.trim() && 'Indica el nom',
    phone: form.phone && !phoneOk(form.phone) && 'Telèfon no vàlid',
    postalCode: !postalOk(form.postalCode) && 'Codi postal de 5 xifres',
  }
  const invalid = Object.values(errors).some(Boolean)

  const save = async () => {
    if (invalid) return
    setSaving(true)
    try {
      await api.updateMyDonor(donor.id, form)
      await refresh()
      setEditing(false)
      notify('Dades actualitzades')
    } catch (e) {
      notify(`No s'han pogut desar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const rotateQr = async () => {
    setRotating(true)
    try {
      await api.rotateMyQr()
      await refresh()
      notify('QR renovat: l\'anterior ja no és vàlid')
    } catch (e) {
      notify(`Error: ${e.message}`)
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="content">
      <div className="carnet">
        <div className="row between">
          <span className="kicker light row gap8"><span className="carnet-ic"><Icon name="card" size={14} /></span> CARNET DIGITAL DE DONANT</span>
          <span className="carnet-id">#{donor.id}</span>
        </div>
        <div className="row gap14">
          <span className="carnet-avatar"><Avatar name={donor.fullName} size={64} /><i><Icon name="check" size={11} color="#fff" stroke={3} /></i></span>
          <div>
            <h2 className="carnet-name">{donor.fullName}</h2>
            <span className="small row gap6 amber-light"><Icon name="medal" size={14} /> Nivell {level.n} · {level.name}</span>
          </div>
        </div>
        <div className="row gap10">
          <div className="carnet-group">
            <b>{blood.short}</b>
            <div>
              <span>{blood.long.toUpperCase()}</span>
              {blood.universal && <span className="teal-light row gap4"><Icon name="globe" size={12} /> Donant Universal</span>}
            </div>
          </div>
          {next
            ? <span className="apt wait"><i /> Pot donar a partir del {next.toLocaleDateString('ca-ES')}</span>
            : <span className="apt"><i /> Apte per donar avui</span>}
        </div>
      </div>

      {!next && (
        <Card className="point-row indigo-card" onClick={() => go('donate')}>
          <span className="iconbox ib-red"><Icon name="calendarPlus" size={20} /></span>
          <div className="grow"><b>Tens disponibilitat immediata</b><p className="small muted">Reserva torn al teu centre de referència</p></div>
          <Icon name="chev" color="#B70011" />
        </Card>
      )}

      <div className="row between">
        <h2 className="h-lg">Impacte acumulat</h2>
        <button className="link red kicker-btn" onClick={() => go('history')}>HISTORIAL <Icon name="code" size={13} /></button>
      </div>
      <div className="stats">
        <Card className="center"><span className="iconbox ib-red round sm"><Icon name="dropFill" size={14} stroke={0} /></span><b className="stat">{total}</b><span className="xs strong">Donacions totals</span></Card>
        <Card className="center"><span className="iconbox ib-teal round sm"><Icon name="drop" size={14} /></span><b className="stat">{(volume / 1000).toFixed(1)}L</b><span className="xs strong">Volum donat</span></Card>
        <Card className="center"><span className="iconbox ib-amber round sm"><Icon name="heart" size={14} /></span><b className="stat red">~{total * 3}</b><span className="xs strong">Vides ajudades</span></Card>
      </div>

      {total > 0 && (
        <Card>
          <div className="row between"><b className="small">Distribució de donacions</b>{last && <span className="xs muted">Última: {fmtDate(last)}</span>}</div>
          <div className="dist">
            <i className="red-bg" style={{ flex: count('whole_blood') }} />
            <i className="amber-bg" style={{ flex: count('plasma') }} />
            <i className="teal-bg" style={{ flex: count('platelets') }} />
            <i className="indigo-bg" style={{ flex: count('tissue_marrow') }} />
          </div>
          <div className="row gap14 xs strong wrap">
            <span className="row gap4"><i className="dot red-bg" /> {count('whole_blood')} Sang</span>
            <span className="row gap4"><i className="dot amber-bg" /> {count('plasma')} Plasma</span>
            <span className="row gap4"><i className="dot teal-bg" /> {count('platelets')} Plaquetes</span>
            {count('tissue_marrow') > 0 && <span className="row gap4"><i className="dot indigo-bg" /> {count('tissue_marrow')} Teixits</span>}
          </div>
        </Card>
      )}

      <button className="export-cta" onClick={() => go('history')}>
        <span className="iconbox ib-indigo"><Icon name="code" size={20} /></span>
        <div className="grow"><b>Exportar registre de donacions</b><span>JSON compatible amb els sistemes del BST</span></div>
        <Icon name="download" size={20} color="#B70011" />
      </button>

      <div className="row between">
        <h2 className="h-lg">Dades personals</h2>
        {!editing && <button className="link red small strong row gap4" onClick={() => { setForm(donor); setEditing(true) }}><Icon name="pencil" size={14} /> Editar</button>}
      </div>

      {editing ? (
        <Card className="form">
          <Field label="Nom i cognoms" error={errors.fullName}><input value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
          <Field label="Telèfon mòbil" error={errors.phone}><input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
          <Field label="Data de naixement"><input type="date" value={form.birthDate || ''} onChange={set('birthDate')} /></Field>
          <Field label="Grup sanguini">
            <select value={form.bloodGroup || ''} onChange={set('bloodGroup')}>
              <option value="">No el sé</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g.replace('-', '−')}</option>)}
            </select>
          </Field>
          <div className="row gap10">
            <div className="grow col"><Field label="Codi postal" error={errors.postalCode}><input inputMode="numeric" maxLength={5} value={form.postalCode} onChange={set('postalCode')} /></Field></div>
            <div className="grow col"><Field label="Municipi"><input value={form.municipality} onChange={set('municipality')} /></Field></div>
          </div>
          <Field label="Barri o districte"><input value={form.district} onChange={set('district')} /></Field>
          <Field label="Zona habitual">
            <select value={form.zone} onChange={set('zone')}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
          </Field>
          <Field label="Centre de referència">
            <select value={form.referenceCenterCode || ''} onChange={set('referenceCenterCode')}>
              {CENTERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <p className="xs muted">El correu ({donor.email}) és el del teu compte i no es pot canviar des d'aquí.</p>
          <Button icon="check" onClick={save} disabled={invalid || saving}>{saving ? 'Desant…' : 'Desar canvis'}</Button>
          <Button variant="ghost" icon="x" onClick={() => setEditing(false)}>Cancel·lar</Button>
        </Card>
      ) : (
        <Card className="list">
          {[
            ['mail', 'Correu electrònic', donor.email],
            ['phone', 'Telèfon mòbil', donor.phone || 'Sense indicar'],
            ['cake', 'Data de naixement', donor.birthDate ? `${fmtDate(new Date(donor.birthDate))} (${years} anys)` : 'Sense indicar'],
            ['pin', 'Municipi / Zona habitual', [donor.municipality, donor.district && `(${donor.district})`].filter(Boolean).join(' ') || donor.zone || 'Sense indicar'],
            ['building', 'Centre de donació de referència', center?.name || 'Sense indicar'],
          ].map(([ic, l, v], i) => (
            <div className="list-row" key={l}>
              <span className={`iconbox ${i === 4 ? 'ib-red' : 'ib-indigo'}`}><Icon name={ic} size={18} /></span>
              <div><span className="xs strong muted">{l}</span><b>{v}</b></div>
            </div>
          ))}
        </Card>
      )}

      <Card className="point-row" onClick={rotating ? undefined : rotateQr}>
        <span className="iconbox ib-indigo"><Icon name="refresh" size={18} /></span>
        <div className="grow"><b>{rotating ? 'Renovant…' : 'Renovar el meu QR'}</b><p className="small muted">Invalida el codi anterior si l'has compartit o en tens una captura.</p></div>
      </Card>

      <button className="link red center strong row center-row gap8" onClick={signOut}><Icon name="logout" size={18} /> Tancar sessió</button>
      <p className="xs muted center">BST App · prototip v3.0</p>
    </div>
  )
}

const Field = ({ label, error, children }) => (
  <label className="field-wrap">
    <span className="field-label sm">{label}</span>
    <div className={`input ${children.type === 'select' ? 'select' : ''} ${error ? 'invalid' : ''}`}>{children}</div>
    {error && <span className="field-error">{error}</span>}
  </label>
)
