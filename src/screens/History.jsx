import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Card, Chip } from '../components/ui.jsx'
import JsonViewer from '../components/JsonViewer.jsx'
import { DONATION_TYPES, CENTERS as POINTS } from '../data.js'
import { donationHistoryRecord } from '../lib/bstRecord.js'
import { fmtDate } from '../lib/dates.js'

const TONE = { whole_blood: 'red', plasma: 'amber', platelets: 'teal', tissue_marrow: 'indigo' }

export default function History({ state, donor, go, notify }) {
  const [selected, setSelected] = useState(null)
  // El JSON es regenera amb la selecció: tot l'historial o una sola donació
  const record = useMemo(
    () => donationHistoryRecord(selected ? state.donations.filter((d) => d.id === selected) : state.donations, donor),
    [selected, state.donations, donor]
  )

  return (
    <div className="content">
      <button className="link strong row gap8" onClick={() => go('profile')}><Icon name="back" size={18} /> Tornar al perfil</button>
      <div>
        <h1 className="h-xl">Historial de donacions</h1>
        <p className="muted">Toca una donació per exportar-ne només el registre, o exporta l'historial complet.</p>
      </div>

      {state.donations.length === 0 && <p className="center muted">Encara no tens donacions registrades. Quan el BST registri la primera, apareixerà aquí.</p>}
      {state.donations.map((d) => {
        const t = DONATION_TYPES.find((x) => x.id === d.type)
        const p = POINTS.find((x) => x.code === d.center)
        const on = selected === d.id
        return (
          <Card key={d.id} className={`point-row ${on ? 'on' : ''}`} onClick={() => setSelected(on ? null : d.id)}>
            <span className={`iconbox ib-${TONE[d.type]}`}><Icon name={t.icon} size={19} /></span>
            <div className="grow">
              <b>{t.label}{d.volume ? ` · ${d.volume} ml` : ''}</b>
              <p className="xs muted">{fmtDate(new Date(d.date))} · {p ? p.name : d.center}</p>
            </div>
            <Chip tone={on ? 'teal' : 'outline'}>{on ? 'Seleccionada' : d.id.slice(-6)}</Chip>
          </Card>
        )
      })}

      <JsonViewer
        data={record}
        notify={notify}
        title={selected ? `Donació ${selected}` : 'Historial complet (JSON)'}
        filename={selected ? `${selected}.json` : `${donor.id}-historial.json`}
      />
      <p className="xs muted center">Format «donation_history» v1.0 · esquema a docs/bst-donation-record.schema.json</p>
    </div>
  )
}
