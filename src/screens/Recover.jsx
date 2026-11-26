import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { emailOk } from '../lib/donor.js'

/** Demana l'enllaç per restablir la contrasenya. */
export function ForgotPassword({ api, go }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!emailOk(email) || busy) return
    setBusy(true)
    setError(null)
    try {
      await api.resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="content" onSubmit={submit} noValidate>
      <button type="button" className="link strong row gap8" onClick={() => go('login')}><Icon name="back" size={18} /> Tornar</button>
      <div>
        <h1 className="h-xl">Recupera l'accés</h1>
        <p className="muted">Escriu el correu del teu compte i t'enviarem un enllaç per crear una contrasenya nova.</p>
      </div>
      {sent ? (
        <div className="info teal-soft row gap10 top">
          <Icon name="mail" size={18} color="#00655C" />
          <span className="small">Si hi ha un compte amb <b>{email.trim()}</b>, rebràs l'enllaç en uns minuts. Revisa també el correu brossa.</span>
        </div>
      ) : (
        <div className="card form">
          <label className="field-label" htmlFor="email">Correu electrònic</label>
          <div className="input">
            <Icon name="mail" size={20} />
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.cat" />
          </div>
          {error && <p className="form-error" role="alert"><Icon name="alert" size={15} /> {error}</p>}
          <Button type="submit" icon="send" disabled={!emailOk(email) || busy}>{busy ? 'Enviant…' : 'Enviar enllaç'}</Button>
        </div>
      )}
    </form>
  )
}

/** S'obre en tornar de l'enllaç del correu (esdeveniment PASSWORD_RECOVERY). */
export function ResetPassword({ api, notify, done }) {
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const valid = pass.length >= 8 && pass === pass2

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await api.updatePassword(pass)
      notify('Contrasenya actualitzada')
      done()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="content" onSubmit={submit} noValidate>
      <div>
        <h1 className="h-xl">Nova contrasenya</h1>
        <p className="muted">Tria una contrasenya nova d'almenys 8 caràcters.</p>
      </div>
      <div className="card form">
        <label className="field-label sm" htmlFor="p1">Contrasenya nova</label>
        <div className="input"><Icon name="lock" size={19} /><input id="p1" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
        <label className="field-label sm" htmlFor="p2">Repeteix-la</label>
        <div className="input"><Icon name="lock" size={19} /><input id="p2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></div>
        {pass2 && pass !== pass2 && <span className="field-error">Les contrasenyes no coincideixen</span>}
        {error && <p className="form-error" role="alert"><Icon name="alert" size={15} /> {error}</p>}
        <Button type="submit" icon="check" disabled={!valid || busy}>{busy ? 'Desant…' : 'Desar contrasenya'}</Button>
      </div>
    </form>
  )
}
