import Icon from '../components/Icon.jsx'
import { Card } from '../components/ui.jsx'

export default function Impact({ state }) {
  const byType = (t) => state.donations.filter((d) => d.type === t)
  const blood = byType('whole_blood').reduce((a, d) => a + d.volume, 0) + 450 // + donacions prèvies a l'app
  const plasma = byType('plasma').reduce((a, d) => a + d.volume, 0)
  const platelets = byType('platelets').reduce((a, d) => a + d.volume, 0)
  const points = 21
  const goal = 30

  return (
    <div className="content">
      <div className="center col gap6">
        <span className="pill-badge"><Icon name="medal" size={14} /> NIVELL 3 · DONANT VITAL</span>
        <span className="kicker">SEGONS ELS TEUS MIL·LILITRES DONATS</span>
      </div>

      <Card className="center impact">
        <span className="iconbox ib-red round" style={{ width: 56, height: 56 }}><Icon name="dropFill" size={26} stroke={0} /></span>
        <span className="kicker">IMPACTE DIRECTE</span>
        <span className="impact-num">{blood.toLocaleString('ca-ES')} ml</span>
        <p className="lead">Has donat {blood.toLocaleString('ca-ES')} ml de sang</p>
      </Card>

      <span className="kicker">DESGLOSSAMENT D'ALTRES DONACIONS</span>
      {[
        ['activity', 'amber', 'Plasma', 'Afèresi líquida', `${plasma} ml`],
        ['platelets', 'teal', 'Plaquetes', 'Concentrat cel·lular', `${platelets} ml`],
        ['tissue', 'indigo', 'Teixits', 'Medul·la / teixits', '1 donació'],
      ].map(([ic, tone, t, s, v]) => (
        <Card key={t} className="point-row">
          <span className={`iconbox ib-${tone} round`}><Icon name={ic} size={19} /></span>
          <div className="grow"><b>{t}</b><p className="small muted">{s}</p></div>
          <b className={`val-${tone}`}>{v}</b>
        </Card>
      ))}

      <div className="goal">
        <div className="row between">
          <b className="row gap8"><Icon name="star" size={20} /> Meta de punts</b>
          <span className="goal-pill">{points} / {goal} punts</span>
        </div>
        <div className="goal-bar"><i style={{ width: `${(points / goal) * 100}%` }} /></div>
        <div className="row between small"><span>Objectiu: {goal} punts</span><span>Premi: Sorteig</span></div>
      </div>
    </div>
  )
}
