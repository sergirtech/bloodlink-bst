import { useState } from 'react'
import Icon from './Icon.jsx'
import { toPrettyJson, downloadJson, copyJson } from '../lib/bstRecord.js'

// Ressaltat simple de sintaxi JSON
function highlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g, (m, str, colon, lit) => {
      if (str) return colon ? `<span class="j-key">${str}</span>${colon}` : `<span class="j-str">${str}</span>`
      if (lit) return `<span class="j-lit">${m}</span>`
      return `<span class="j-num">${m}</span>`
    })
}

export default function JsonViewer({ data, filename, notify, title = 'Registre JSON per al BST', collapsedLines = 14 }) {
  const [open, setOpen] = useState(false)
  const json = toPrettyJson(data)
  const lines = json.split('\n').length
  return (
    <div className="json">
      <div className="json-head">
        <span className="row gap8"><Icon name="code" size={17} /> <b>{title}</b></span>
        <span className="json-meta">{lines} línies · {(new Blob([json]).size / 1024).toFixed(1)} KB</span>
      </div>
      <pre className={open ? 'open' : ''} style={{ '--rows': collapsedLines }} dangerouslySetInnerHTML={{ __html: highlight(json) }} />
      {lines > collapsedLines && (
        <button className="json-more" onClick={() => setOpen(!open)}>{open ? 'Mostrar menys' : `Mostrar tot (${lines} línies)`}</button>
      )}
      <div className="json-actions">
        <button onClick={() => { downloadJson(data, filename); notify && notify(`Descarregat ${filename}`) }}><Icon name="download" size={16} /> Descarregar .json</button>
        <button onClick={async () => notify && notify((await copyJson(data)) ? 'JSON copiat al porta-retalls' : 'No s\'ha pogut copiar')}><Icon name="copy" size={16} /> Copiar</button>
      </div>
    </div>
  )
}
