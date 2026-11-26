import Icon from '../components/Icon.jsx'
import { Button, Card } from '../components/ui.jsx'
import { LEVELS, POINTS_PER, levelInfo, nextEligibleDate } from '../lib/donor.js'
import { fmtDate } from '../lib/dates.js'

export default function Impact({ state, go }) {
  const byType = (t) => state.donations.filter((d) => d.type === t)
  const ml = (t) => byType(t).reduce((a, d) => a + (d.volume || 0), 0)
  const blood = ml('whole_blood')
  const { points, level, next } = levelInfo(state.donations)
  const eligible = nextEligibleDate(state.donations)
  const from = level.min
  const to = next ? next.min : points
  const pct = next ? ((points - from) / (to - from)) * 100 : 100
  const tissues = byType('tissue_marrow').length

  return (
    <div className="content">
      <div className="center col gap6">
        <span className="pill-badge"><Icon name="medal" size={14} /> NIVELL {level.n} · {level.name.toUpperCase()}</span>
        <span className="kicker">SEGONS ELS PUNTS DE LES TEVES DONACIONS</span>
      </div>

      <Card className="center impact">
        <span className="iconbox ib-red round" style={{ width: 56, height: 56 }}><Icon name="dropFill" size={26} stroke={0} /></span>
        <span className="kicker">IMPACTE DIRECTE</span>
        <span className="impact-num">{blood.toLocaleString('ca-ES')} ml</span>
        <p className="lead">{blood ? `Has donat ${blood.toLocaleString('ca-ES')} ml de sang` : 'Encara no has donat sang total'}</p>
        <p className="small muted">Cada donació de sang pot ajudar fins a 3 pacients.</p>
      </Card>

      <span className="kicker">DESGLOSSAMENT D'ALTRES DONACIONS</span>
      {[
        ['activity', 'amber', 'Plasma', 'Afèresi líquida', `${ml('plasma')} ml`],
        ['platelets', 'teal', 'Plaquetes', 'Concentrat cel·lular', `${ml('platelets')} ml`],
        ['tissue', 'indigo', 'Teixits', 'Medul·la / teixits', `${tissues} ${tissues === 1 ? 'donació' : 'donacions'}`],
      ].map(([ic, tone, t, s, v]) => (
        <Card key={t} className="point-row">
          <span className={`iconbox ib-${tone} round`}><Icon name={ic} size={19} /></span>
          <div className="grow"><b>{t}</b><p className="small muted">{s}</p></div>
          <b className={`val-${tone}`}>{v}</b>
        </Card>
      ))}

      <div className="goal">
        <div className="row between">
          <b className="row gap8"><Icon name="star" size={20} /> {next ? `Cap al nivell ${next.n}` : 'Nivell màxim!'}</b>
          <span className="goal-pill">{points} / {to} punts</span>
        </div>
        <div className="goal-bar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
        <div className="row between small">
          <span>{next ? `Et falten ${to - points} punts per a «${next.name}»` : 'Ets un dels donants més compromesos'}</span>
        </div>
      </div>

      <Card>
        <b className="small">Com es guanyen punts</b>
        <div className="row gap14 xs strong wrap">
          <span>Sang: {POINTS_PER.whole_blood}</span><span>Plasma: {POINTS_PER.plasma}</span>
          <span>Plaquetes: {POINTS_PER.platelets}</span><span>Teixits: {POINTS_PER.tissue_marrow}</span>
        </div>
        <p className="xs muted">Nivells: {LEVELS.map((l) => `${l.n} ${l.name} (${l.min})`).join(' · ')}</p>
      </Card>

      {eligible
        ? <p className="center small muted">Podràs tornar a donar a partir del {fmtDate(eligible)}.</p>
        : <Button icon="dropFill" onClick={() => go('donate')}>Suma punts: reserva hora</Button>}
    </div>
  )
}
