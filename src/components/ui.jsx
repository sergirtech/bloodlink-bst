import Icon from './Icon.jsx'

export const Chip = ({ children, tone = 'soft', icon, onClick, active, className = '' }) => (
  <span className={`chip chip-${active ? 'active' : tone} ${onClick ? 'clickable' : ''} ${className}`} onClick={onClick}>
    {icon && <Icon name={icon} size={13} />}
    {children}
  </span>
)

export const Button = ({ children, icon, variant = 'primary', onClick, disabled, small, type = 'button' }) => (
  <button type={type} className={`btn btn-${variant} ${small ? 'btn-sm' : ''}`} onClick={onClick} disabled={disabled}>
    {icon && <Icon name={icon} size={small ? 16 : 19} />}
    {children}
  </button>
)

export const Card = ({ children, className = '', onClick, style }) => (
  <div className={`card ${onClick ? 'clickable' : ''} ${className}`} onClick={onClick} style={style}>{children}</div>
)

export const IconBox = ({ name, tone = 'red', size = 40, round, onClick }) => (
  <span className={`iconbox ib-${tone} ${round ? 'round' : ''} ${onClick ? 'clickable' : ''}`} style={{ width: size, height: size }} onClick={onClick}>
    <Icon name={name} size={Math.round(size * 0.5)} />
  </span>
)

export const Avatar = ({ size = 40, ring }) => (
  <span className={`avatar ${ring ? 'ring' : ''}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>MV</span>
)

// Valoració d'1 a 5 estrelles: interactiva si rep onChange
export function Stars({ value = 0, onChange, size = 18 }) {
  return (
    <span className={`stars ${onChange ? 'editable' : ''}`} role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} de 5 estrelles`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} aria-label={`${n} estrelles`}
          className={n <= value ? 'on' : ''} onClick={() => onChange && onChange(n === value ? 0 : n)}>
          <Icon name="star" size={size} fill={n <= value ? 'currentColor' : 'none'} stroke={1.8} />
        </button>
      ))}
    </span>
  )
}
