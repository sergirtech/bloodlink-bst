import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from '../components/Icon.jsx'
import { Chip } from '../components/ui.jsx'
import { parseQr } from '../lib/db.js'
import { age, bloodLabel } from '../lib/donor.js'
import { fmtDateTime } from '../lib/dates.js'
import { CENTER, STATUS, TYPE } from './Backoffice.jsx'

const ACTIVE = ['scheduled', 'checked_in']

/** Llegeix un QR d'una imatge (canvas) i en retorna el text, o null. */
function decode(canvas, source, w, h) {
  const scale = Math.min(1, 800 / Math.max(w, h))
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data || null
}

export default function Scanner({ api, notify, reload, appointments = [] }) {
  const video = useRef(null)
  const canvas = useRef(null)
  const stream = useRef(null)
  const raf = useRef(0)
  const [camera, setCamera] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // { payload, donor, appointment }
  const [manual, setManual] = useState('')

  const stop = () => {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    setCamera(false)
  }
  useEffect(() => stop, [])

  // Valida el QR amb la base de dades (tokens) i mostra el donant i la cita
  const handle = async (text) => {
    setError(null)
    setBusy(true)
    try {
      const payload = parseQr(text)
      const r = await api.verifyQr(payload)
      // Si el QR no porta cita, es busca la cita activa del donant
      const appointment = r.appointment
        || appointments.find((a) => a.donorId === r.donor.id && ACTIVE.includes(a.status))
        || (await api.listAppointments()).find((a) => a.donorId === r.donor.id && ACTIVE.includes(a.status))
        || null
      setResult({ payload, donor: r.donor, appointment })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const start = async () => {
    setError(null)
    setResult(null)
    if (!navigator.mediaDevices?.getUserMedia) return setError('Aquest navegador no permet fer servir la càmera. Puja una imatge del QR.')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      setCamera(true)
      const v = video.current
      v.srcObject = stream.current
      await v.play()
      const tick = () => {
        if (!stream.current) return
        if (v.readyState >= 2) {
          const text = decode(canvas.current, v, v.videoWidth, v.videoHeight)
          if (text) { stop(); handle(text); return }
        }
        raf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (e) {
      stop()
      setError(e.name === 'NotAllowedError' ? 'Has denegat el permís de càmera. Activa\'l al navegador o puja una imatge.' : 'No s\'ha pogut obrir la càmera.')
    }
  }

  const fromFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setResult(null)
    const img = new Image()
    img.onload = () => {
      const text = decode(canvas.current, img, img.naturalWidth, img.naturalHeight)
      URL.revokeObjectURL(img.src)
      text ? handle(text) : setError('No s\'ha trobat cap QR a la imatge.')
    }
    img.onerror = () => setError('No s\'ha pogut llegir la imatge.')
    img.src = URL.createObjectURL(file)
  }

  const act = async (fn, msg) => {
    setBusy(true)
    try {
      const out = await fn()
      notify(msg)
      reload()
      const all = await api.listAppointments()
      setResult((r) => ({ ...r, appointment: all.find((a) => a.id === r.appointment.id) || r.appointment, donation: out?.id ? out : r.donation }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const a = result?.appointment
  const d = result?.donor
  const today = a && new Date(a.start).toDateString() === new Date().toDateString()

  return (
    <div className="bo-cols">
      <section className="bo-card grow scan-box">
        <div className="bo-card-head"><h2>Llegir QR del donant</h2></div>
        <div className={`scan-view ${camera ? 'on' : ''}`}>
          <video ref={video} playsInline muted />
          {camera && <span className="scan-frame" />}
          {!camera && <div className="scan-idle"><Icon name="qr" size={42} /><span>Obre la càmera i apunta al QR de la pantalla d'Inici del donant</span></div>}
        </div>
        <canvas ref={canvas} hidden />
        <div className="row gap10 wrap">
          {camera
            ? <button className="bo-btn" onClick={stop}><Icon name="x" size={14} /> Aturar càmera</button>
            : <button className="bo-btn primary" onClick={start} disabled={busy}><Icon name="camera" size={14} /> Obrir càmera</button>}
          <label className="bo-btn">
            <Icon name="image" size={14} /> Pujar imatge
            <input type="file" accept="image/*" hidden onChange={fromFile} />
          </label>
        </div>
        <details className="scan-manual">
          <summary>Introduir el contingut manualment</summary>
          <textarea rows={4} value={manual} onChange={(e) => setManual(e.target.value)} placeholder='{"type":"bst.checkin","v":1,"donor_id":"BST-…","token":"…"}' />
          <button className="bo-btn" disabled={!manual.trim() || busy} onClick={() => handle(manual)}>Validar</button>
        </details>
        {busy && <p className="small muted">Validant…</p>}
        {error && <div className="db-error">{error}</div>}
      </section>

      <section className="bo-card side">
        <div className="bo-card-head"><h2>Resultat</h2></div>
        {!result && <div className="bo-empty"><Icon name="qr" size={22} /> Encara no s'ha llegit cap QR.</div>}
        {d && (
          <>
            <div className="scan-ok"><Icon name="checkCircle" size={18} /> QR vàlid i verificat</div>
            <div className="bo-row">
              <span className="iconbox ib-red sm"><Icon name="user" size={15} /></span>
              <div className="grow"><b>{d.fullName}</b><span>#{d.id} · {d.bloodGroup ? bloodLabel(d.bloodGroup).short : 'grup pendent'}{d.birthDate ? ` · ${age(d.birthDate)} anys` : ''}</span></div>
            </div>
            {d.phone && <span className="small muted">{d.phone} · {d.email}</span>}

            {a ? (
              <div className="scan-appt">
                <div className="row between"><b className="mono small">{a.id}</b><Chip tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Chip></div>
                <span>{TYPE[a.typeId].label} · {CENTER[a.pointCode]?.name}</span>
                <span className="small">{fmtDateTime(a.start)}</span>
                {!today && ACTIVE.includes(a.status) && <span className="bo-alert small"><Icon name="alert" size={15} /> La cita no és d'avui</span>}
                <div className="row gap8 wrap">
                  {a.status === 'scheduled' && <button className="bo-btn" disabled={busy} onClick={() => act(() => api.checkIn(a.id), 'Arribada registrada')}>Registrar arribada</button>}
                  {ACTIVE.includes(a.status) && <button className="bo-btn primary" disabled={busy} onClick={() => act(() => api.completeAppointment(a.id), 'Donació registrada')}><Icon name="check" size={14} /> Donació feta</button>}
                  {ACTIVE.includes(a.status) && <button className="bo-btn" disabled={busy} onClick={() => act(() => api.setAppointmentStatus(a.id, 'no_show'), 'No presentat')}>No presentat</button>}
                </div>
                {result.donation && <span className="small teal-dark">Donació {result.donation.id} creada · {result.donation.volume || '—'} ml</span>}
              </div>
            ) : <p className="small muted">El donant no té cap cita activa. Pot reservar-ne una des de l'app.</p>}

            <details>
              <summary className="small">JSON llegit del QR</summary>
              <pre className="qr-json">{JSON.stringify({ ...result.payload, token: '••••', appointment_token: result.payload.appointment_token && '••••' }, null, 2)}</pre>
            </details>
            <button className="bo-btn" onClick={() => { setResult(null); start() }}><Icon name="camera" size={14} /> Escanejar el següent</button>
          </>
        )}
      </section>
    </div>
  )
}
