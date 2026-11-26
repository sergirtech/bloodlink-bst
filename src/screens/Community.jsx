import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Card, Chip, Stars } from '../components/ui.jsx'
import { ZONES, RATING_FIELDS, CENTERS } from '../data.js'
import { timeAgo } from '../lib/dates.js'

const EMPTY = { time: 0, satisfaction: 0, again: 0 }
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function RatingRows({ ratings, onChange, size = 16 }) {
  return (
    <div className="ratings">
      {RATING_FIELDS.map((f) => (
        <div className="rating-row" key={f.key}>
          <div>
            <span className="rating-label">{f.label}</span>
            {onChange && <span className="rating-hint">{f.hint}</span>}
          </div>
          <Stars value={ratings[f.key]} size={size} onChange={onChange ? (v) => onChange({ ...ratings, [f.key]: v }) : undefined} />
        </div>
      ))}
    </div>
  )
}

export default function Community({ state, donor, api, update, notify }) {
  const myZone = donor.zone || ZONES[0]
  const [text, setText] = useState('')
  const [rate, setRate] = useState(true)
  const [ratings, setRatings] = useState(EMPTY)
  const [zone, setZone] = useState('mine')
  const [order, setOrder] = useState('new')
  const [showFilters, setShowFilters] = useState(true)
  const [center, setCenter] = useState(donor.referenceCenterCode || 'BST-MOB-UPC')
  const [saving, setSaving] = useState(false)

  const posts = useMemo(() => {
    const filtered = state.posts.filter((p) => zone === 'all' || (zone === 'mine' ? p.zone === myZone : p.zone === zone))
    return filtered.sort((a, b) => (order === 'new' ? a.minutesAgo - b.minutesAgo : b.minutesAgo - a.minutesAgo))
  }, [state.posts, zone, order, myZone])

  // Mitjana de valoracions dels missatges visibles: dada útil també per al BST
  const rated = posts.filter((p) => p.ratings)
  const summary = RATING_FIELDS.map((f) => [f, avg(rated.map((p) => p.ratings[f.key]))])

  const complete = !rate || Object.values(ratings).every((v) => v > 0)
  const publish = async () => {
    if (!text.trim() || !complete) return
    const c = rate ? CENTERS.find((x) => x.code === center) : null
    setSaving(true)
    try {
      const post = await api.addPost({ author: donor.fullName,
        place: c ? c.name : myZone, zone: c ? c.zone : myZone, centerCode: c ? c.code : null,
        text: text.trim(), ratings: rate ? ratings : null,
      })
      update({ posts: [post, ...state.posts.filter((p) => p.id !== post.id)] })
    } catch (e) {
      notify(`No s'ha pogut publicar: ${e.message}`)
      return
    } finally {
      setSaving(false)
    }
    setText('')
    setRatings(EMPTY)
    setZone('mine')
    setOrder('new')
    notify('Missatge publicat')
  }

  return (
    <div className="content">
      <Card>
        <h1 className="h-lg row gap10"><Icon name="users" size={24} color="#B70011" /> Fòrum de la Comunitat</h1>
        <Chip tone="indigo" icon="pin">Zona activa: <span className="teal">{myZone}</span></Chip>
      </Card>

      <Card className="form">
        <span className="field-label sm">Publicant com a:</span>
        <div className="input readonly">
          <Icon name="userCircle" size={19} color="#B70011" />
          <b className="grow">{donor.fullName}</b>
          <span className="teal xs strong">{myZone}</span>
        </div>
        <label className="field-label sm" htmlFor="msg">Descriu la teva experiència de donació</label>
        <textarea id="msg" className="textarea" rows={3} maxLength={2000} placeholder="Descriu la teva experiència donant sang..." value={text} onChange={(e) => setText(e.target.value)} />

        <div className="rate-box">
          <div className="row between">
            <span className="field-label sm nomargin row gap6"><Icon name="star" size={15} color="#B70011" /> Valora la teva donació</span>
            <label className="switch-label">
              <input type="checkbox" checked={rate} onChange={(e) => setRate(e.target.checked)} />
              <span className="switch" /> {rate ? 'Sí' : 'És una pregunta'}
            </label>
          </div>
          {rate && (
            <label className="center-select">
              <span className="rating-label">On has donat?</span>
              <select value={center} onChange={(e) => setCenter(e.target.value)}>
                {CENTERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
          )}
          {rate && <RatingRows ratings={ratings} onChange={setRatings} size={22} />}
          {rate && !complete && text.trim() && <p className="xs red">Valora els tres apartats per publicar.</p>}
        </div>

        <Button icon="send" onClick={publish} disabled={!text.trim() || !complete || saving}>{saving ? 'Publicant…' : 'Publicar missatge'}</Button>
      </Card>

      <div className="row between">
        <h2 className="h-lg">Missatges recents</h2>
        <button className={`filter-btn ${showFilters ? 'on' : ''}`} onClick={() => setShowFilters(!showFilters)}><Icon name="filter" size={16} /> Filtres</button>
      </div>

      {showFilters && (
        <Card className="filters">
          <div className="row between">
            <span className="kicker row gap6"><Icon name="pin" size={13} color="#00655C" /> Zona geogràfica</span>
            <span className="teal xs strong">{zone === 'mine' ? myZone : zone === 'all' ? 'Totes' : zone}</span>
          </div>
          <div className="chips">
            <Chip tone="pill" active={zone === 'mine'} onClick={() => setZone('mine')}>La meva zona</Chip>
            <Chip tone="pill" active={zone === 'all'} onClick={() => setZone('all')}>Totes les zones</Chip>
            {ZONES.slice(1).map((z) => <Chip key={z} tone="pill" active={zone === z} onClick={() => setZone(z)}>{z}</Chip>)}
          </div>
          <span className="kicker row gap6"><Icon name="clock" size={13} color="#B70011" /> Ordre per data</span>
          <div className="chips">
            <Chip tone="pill" icon="arrowDown" active={order === 'new'} onClick={() => setOrder('new')}>Més recents primer</Chip>
            <Chip tone="pill" icon="arrowUp" active={order === 'old'} onClick={() => setOrder('old')}>Més antics</Chip>
          </div>
        </Card>
      )}

      {rated.length > 0 && (
        <Card className="summary">
          <span className="kicker">VALORACIÓ MITJANA · {rated.length} {rated.length === 1 ? 'EXPERIÈNCIA' : 'EXPERIÈNCIES'}</span>
          <div className="summary-grid">
            {summary.map(([f, v]) => (
              <div key={f.key}><b>{v.toFixed(1)}</b><Stars value={Math.round(v)} size={12} /><span>{f.label}</span></div>
            ))}
          </div>
        </Card>
      )}

      {posts.map((p) => (
        <Card key={p.id} className="post">
          <div className="row between top">
            <div>
              <b className="post-author">{p.author}</b>
              <p className="xs teal-dark row gap6"><Icon name="pin" size={13} color="#00655C" /> {p.place}</p>
            </div>
            <Chip tone="indigo" icon="clock">{timeAgo(p.minutesAgo)}</Chip>
          </div>
          <p className="post-text">{p.text}</p>
          {p.ratings
            ? <RatingRows ratings={p.ratings} />
            : <Chip tone="outline">Pregunta · sense valoració</Chip>}
        </Card>
      ))}
      {posts.length === 0 && <p className="center muted">Encara no hi ha missatges en aquesta zona.</p>}
    </div>
  )
}
