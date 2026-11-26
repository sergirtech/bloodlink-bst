import { useEffect, useState } from 'react'
import QR from 'qrcode'

/**
 * QR real i llegible per qualsevol escàner. Codifica `value` (text o objecte → JSON).
 * Nivell de correcció Q (25 %): permet posar la gota al centre sense perdre lectura.
 */
export default function QRCode({ value, size = 200, logo = true }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let alive = true
    QR.toString(text, { type: 'svg', errorCorrectionLevel: 'Q', margin: 1, color: { dark: '#131B2E', light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => { alive = false }
  }, [text])

  return (
    <div className="qr-real" style={{ width: size, height: size }} role="img" aria-label="Codi QR del donant">
      <div className="qr-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      {logo && svg && (
        <span className="qr-logo">
          <svg viewBox="0 0 24 24" width="60%" height="60%"><path d="M12 3s-6 6.4-6 10.4a6 6 0 0 0 12 0C18 9.4 12 3 12 3z" fill="#fff" /></svg>
        </span>
      )}
    </div>
  )
}
