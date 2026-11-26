import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function Login({ go, notify }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    go('home')
  }

  return (
    <form className="content" onSubmit={submit}>
      <div className="login-hero">
        <span className="login-logo">
          <Icon name="dropFill" size={34} color="#fff" stroke={0} />
          <i><Icon name="heart" size={12} color="#B70011" stroke={2.4} /></i>
        </span>
        <span className="kicker red">BANC DE SANG I TEIXITS</span>
        <h1 className="h-xl">Inicia sessió</h1>
        <p className="muted center">Connecta amb la teva comunitat de donants i segueix el rastre de les teves vides salvades a Catalunya.</p>
      </div>

      <div className="card form">
        <label className="field-label" htmlFor="email">Correu electrònic</label>
        <div className="input">
          <Icon name="mail" size={20} />
          <input id="email" type="email" placeholder="nom@exemple.cat" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="row between">
          <label className="field-label" htmlFor="pass">Contrasenya</label>
          <button type="button" className="link red small strong" onClick={() => notify("T'hem enviat un correu per recuperar-la")}>Has oblidat la clau?</button>
        </div>
        <div className="input">
          <Icon name="lock" size={20} />
          <input id="pass" type={show ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button type="button" onClick={() => setShow(!show)} aria-label="Mostrar contrasenya"><Icon name={show ? 'eyeOff' : 'eye'} size={20} /></button>
        </div>
        <Button type="submit" icon="login">Iniciar sessió</Button>
      </div>

      <p className="center">No tens compte? <button type="button" className="link red strong underline" onClick={() => notify('El registre es fa amb el teu DNI al punt de donació')}>Registra't aquí</button></p>
      <p className="center muted small row center-row gap6"><Icon name="shield" size={15} /> Prototip conceptual · no és una app oficial del BST</p>
    </form>
  )
}
