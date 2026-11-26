import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { CENTERS, ZONES } from '../data.js'
import { BLOOD_GROUPS, ageError, emailOk, phoneOk, postalOk } from '../lib/donor.js'

const EMPTY = {
  fullName: '', email: '', password: '', password2: '', birthDate: '', phone: '', bloodGroup: '',
  postalCode: '', municipality: '', district: '', zone: ZONES[0], referenceCenterCode: 'BST-HCB',
}

export default function Register({ api, go }) {
  const [f, setF] = useState(EMPTY)
  const [consent, setConsent] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(null) // correu pendent de confirmar

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const errors = {
    fullName: f.fullName.trim().split(/\s+/).length < 2 && 'Escriu el nom i almenys un cognom',
    email: !emailOk(f.email) && 'El correu no és vàlid',
    password: f.password.length < 8 && 'Mínim 8 caràcters',
    password2: f.password2 !== f.password && 'Les contrasenyes no coincideixen',
    birthDate: ageError(f.birthDate),
    phone: !phoneOk(f.phone) && 'Telèfon de 9 xifres (pots posar +34)',
    postalCode: !postalOk(f.postalCode) && 'Codi postal de 5 xifres',
    municipality: !f.municipality.trim() && 'Indica el municipi',
    consent: !consent && 'Cal acceptar el tractament de dades',
  }
  const firstError = Object.values(errors).find(Boolean)

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (firstError || busy) return
    setBusy(true)
    setError(null)
    try {
      const { session } = await api.signUp(f.email, f.password, f)
      // Amb sessió, l'app entra sola. Si no, s'intenta entrar directament
      // (compte confirmat automàticament); si tampoc, cal confirmar el correu.
      if (!session) {
        try { await api.signIn(f.email, f.password) } catch { setPending(f.email.trim()) }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pending) {
    return (
      <div className="content center">
        <span className="done-ic"><Icon name="mail" size={40} /></span>
        <h1 className="h-xl">Revisa el correu</h1>
        <p className="muted">T'hem enviat un enllaç a <b>{pending}</b> per confirmar el compte. Un cop confirmat, ja podràs iniciar sessió.</p>
        <Button icon="login" onClick={() => go('login')}>Anar a iniciar sessió</Button>
      </div>
    )
  }

  const field = (k, label, props = {}, icon) => (
    <>
      <label className="field-label sm" htmlFor={k}>{label}</label>
      <div className={`input ${touched && errors[k] ? 'invalid' : ''}`}>
        {icon && <Icon name={icon} size={19} />}
        <input id={k} value={f[k]} onChange={set(k)} {...props} />
      </div>
      {touched && errors[k] && <span className="field-error">{errors[k]}</span>}
    </>
  )

  return (
    <form className="content" onSubmit={submit} noValidate>
      <button type="button" className="link strong row gap8" onClick={() => go('login')}><Icon name="back" size={18} /> Ja tinc compte</button>
      <div>
        <h1 className="h-xl">Crea el teu compte</h1>
        <p className="muted">Registra't com a donant per reservar hora, tenir el teu QR i seguir el teu historial.</p>
      </div>

      <div className="card form">
        <span className="kicker red">ACCÉS</span>
        {field('fullName', 'Nom i cognoms', { autoComplete: 'name', placeholder: 'Laia Rovira Puig' }, 'user')}
        {field('email', 'Correu electrònic', { type: 'email', autoComplete: 'email', placeholder: 'nom@exemple.cat' }, 'mail')}
        {field('password', 'Contrasenya', { type: 'password', autoComplete: 'new-password', placeholder: 'Mínim 8 caràcters' }, 'lock')}
        {field('password2', 'Repeteix la contrasenya', { type: 'password', autoComplete: 'new-password' }, 'lock')}
      </div>

      <div className="card form">
        <span className="kicker red">DADES DE DONANT</span>
        {field('birthDate', 'Data de naixement', { type: 'date', max: new Date().toISOString().slice(0, 10) }, 'cake')}
        {field('phone', 'Telèfon mòbil', { type: 'tel', autoComplete: 'tel', placeholder: '+34 600 00 00 00' }, 'phone')}
        <label className="field-label sm" htmlFor="bloodGroup">Grup sanguini</label>
        <div className="input select">
          <Icon name="drop" size={19} />
          <select id="bloodGroup" value={f.bloodGroup} onChange={set('bloodGroup')}>
            <option value="">No el sé (el determinarà el BST)</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g.replace('-', '−')}</option>)}
          </select>
        </div>
        <div className="row gap10">
          <div className="grow col">{field('postalCode', 'Codi postal', { inputMode: 'numeric', maxLength: 5, placeholder: '08028' })}</div>
          <div className="grow col">{field('municipality', 'Municipi', { placeholder: 'Barcelona' })}</div>
        </div>
        {field('district', 'Barri o districte (opcional)', { placeholder: 'Les Corts' })}
        <label className="field-label sm" htmlFor="zone">Zona habitual</label>
        <div className="input select">
          <Icon name="pin" size={19} />
          <select id="zone" value={f.zone} onChange={set('zone')}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
        </div>
        <label className="field-label sm" htmlFor="center">Centre de referència</label>
        <div className="input select">
          <Icon name="building" size={19} />
          <select id="center" value={f.referenceCenterCode} onChange={set('referenceCenterCode')}>
            {CENTERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span className="small">Accepto que el BST tracti les meves dades per gestionar les donacions, d'acord amb el RGPD. Puc demanar-ne l'accés o l'esborrament en qualsevol moment.</span>
      </label>
      {touched && errors.consent && <span className="field-error">{errors.consent}</span>}

      {error && <p className="form-error" role="alert"><Icon name="alert" size={15} /> {error}</p>}
      {touched && firstError && !error && <p className="form-error"><Icon name="alert" size={15} /> Revisa els camps marcats.</p>}
      <Button type="submit" icon="checkCircle" disabled={busy}>{busy ? 'Creant el compte…' : 'Crear compte'}</Button>
    </form>
  )
}
