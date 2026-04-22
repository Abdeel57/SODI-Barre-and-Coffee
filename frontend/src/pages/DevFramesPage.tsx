import { useState, useRef, useCallback } from 'react'
import { TIER_ICONS } from '../types'
import type { TierId } from '../types'

const CANVAS = 260
const PHOTO  = 160

const DEFAULT_AVATAR =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <rect width="300" height="300" fill="#e8c4c4"/>
    <circle cx="150" cy="110" r="65" fill="#c9956e"/>
    <ellipse cx="150" cy="270" rx="95" ry="75" fill="#c9956e"/>
  </svg>`)

const TIERS: { id: TierId; label: string }[] = [
  { id: 'plie',      label: 'Plié'      },
  { id: 'arabesque', label: 'Arabesque' },
  { id: 'attitude',  label: 'Attitude'  },
  { id: 'prima',     label: 'Prima'     },
]

interface Cfg { scale: number; offsetX: number; offsetY: number }
type AllCfgs = Record<string, Cfg>

const DEFAULT_CFGS: AllCfgs = {
  plie:      { scale: 1.15, offsetX: 0, offsetY: 0 },
  arabesque: { scale: 1.15, offsetX: 0, offsetY: 0 },
  attitude:  { scale: 1.12, offsetX: 0, offsetY: 0 },
  prima:     { scale: 1.08, offsetX: 0, offsetY: 0 },
}

interface FrameEditorProps {
  tierId: TierId
  label:  string
  avatar: string
  cfg:    Cfg
  onChange: (cfg: Cfg) => void
}

function FrameEditor({ tierId, label, avatar, cfg, onChange }: FrameEditorProps) {
  const iconUrl = TIER_ICONS[tierId]

  const dragging  = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const frameSize = PHOTO * cfg.scale
  const photoOffset = (CANVAS - PHOTO) / 2

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current  = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    onChange({ ...cfg, offsetX: cfg.offsetX + dx, offsetY: cfg.offsetY + dy })
  }, [cfg, onChange])

  const stopDrag = useCallback(() => { dragging.current = false }, [])

  const lastTouch = useRef({ x: 0, y: 0 })
  const onTouchStart = (e: React.TouchEvent) => {
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - lastTouch.current.x
    const dy = e.touches[0].clientY - lastTouch.current.y
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    onChange({ ...cfg, offsetX: cfg.offsetX + dx, offsetY: cfg.offsetY + dy })
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 20,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      userSelect: 'none',
    }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#222' }}>{label}</p>

      {/* Canvas */}
      <div
        style={{
          position: 'relative', width: CANVAS, height: CANVAS, cursor: 'default',
          background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
          borderRadius: 12, overflow: 'hidden',
        }}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {/* Foto */}
        <div style={{
          position: 'absolute', top: photoOffset, left: photoOffset,
          width: PHOTO, height: PHOTO, borderRadius: '50%', overflow: 'hidden',
        }}>
          <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        </div>

        {/* Marco PNG */}
        {iconUrl && (
          <img
            src={iconUrl} alt=""
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            style={{
              position: 'absolute', width: frameSize, height: frameSize,
              top: '50%', left: '50%',
              transform: `translate(calc(-50% + ${cfg.offsetX}px), calc(-50% + ${cfg.offsetY}px))`,
              objectFit: 'contain', cursor: 'grab', touchAction: 'none',
            }}
          />
        )}
      </div>

      {/* Slider tamaño */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 4 }}>
          <span>Tamaño del marco</span>
          <span style={{ fontWeight: 600 }}>{(cfg.scale * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range" min="0.5" max="2.0" step="0.01"
          value={cfg.scale}
          onChange={(e) => onChange({ ...cfg, scale: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#1a1a1a' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginTop: 2 }}>
          <span>50%</span><span>100%</span><span>150%</span><span>200%</span>
        </div>
      </div>

      {/* Sliders de posición */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 4 }}>
            <span>← Izquierda / Derecha →</span>
            <span style={{ fontWeight: 600 }}>{Math.round(cfg.offsetX)}px</span>
          </div>
          <input
            type="range" min="-80" max="80" step="1"
            value={cfg.offsetX}
            onChange={(e) => onChange({ ...cfg, offsetX: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#1a1a1a' }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 4 }}>
            <span>↑ Arriba / Abajo ↓</span>
            <span style={{ fontWeight: 600 }}>{Math.round(cfg.offsetY)}px</span>
          </div>
          <input
            type="range" min="-80" max="80" step="1"
            value={cfg.offsetY}
            onChange={(e) => onChange({ ...cfg, offsetY: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#1a1a1a' }}
          />
        </div>
      </div>

      {/* Previews en tamaños reales de la app */}
      <div style={{ width: '100%', borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#888', fontWeight: 600 }}>
          Vista previa en tamaños reales de la app:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {[
            { size: 48,  label: 'Lista logros' },
            { size: 72,  label: 'Perfil (actual)' },
            { size: 96,  label: 'Perfil (grande)' },
          ].map(({ size: s, label: lbl }) => {
            const EDITOR_REF = 160
            const ratio     = s / EDITOR_REF
            const frameSize = s * cfg.scale
            const ox        = cfg.offsetX * ratio
            const oy        = cfg.offsetY * ratio
            const iconUrl   = TIER_ICONS[tierId]
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ position: 'relative', width: s, height: s, overflow: 'visible' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%', overflow: 'hidden', background: '#F2EBE1',
                  }}>
                    <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                  {iconUrl && (
                    <img src={iconUrl} alt="" style={{
                      position:  'absolute',
                      width:     frameSize, height: frameSize,
                      top: '50%', left: '50%',
                      transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`,
                      objectFit: 'contain',
                      zIndex:    1,
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#aaa' }}>{lbl} ({s}px)</span>
              </div>
            )
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>También puedes arrastrar el marco con el mouse</p>

      {/* Reset individual */}
      <button
        onClick={() => onChange(DEFAULT_CFGS[tierId])}
        style={{
          padding: '4px 12px', background: '#f0f0f0', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#555',
        }}
      >
        Resetear
      </button>
    </div>
  )
}

export default function DevFramesPage() {
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [cfgs, setCfgs] = useState<AllCfgs>({ ...DEFAULT_CFGS })
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const SIZE = 300
        const canvas = document.createElement('canvas')
        canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext('2d')!
        const side = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
        setAvatar(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSave() {
    setSaveState('saving')
    try {
      const res = await fetch('/dev-frames/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfgs),
      })
      if (!res.ok) throw new Error('Error del servidor')
      setSaveState('ok')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const saveLabel = saveState === 'saving' ? 'Guardando…'
    : saveState === 'ok'    ? '✓ ¡Guardado! Visible al público'
    : saveState === 'error' ? '✗ Error al guardar'
    : '💾 Guardar configuración'

  const saveBg = saveState === 'ok' ? '#16a34a'
    : saveState === 'error' ? '#dc2626'
    : '#1a1a1a'

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3F0', padding: '32px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎨 Editor de marcos</h1>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{
            padding: '10px 24px', background: saveBg, color: '#fff',
            border: 'none', borderRadius: 8, cursor: saveState === 'saving' ? 'default' : 'pointer',
            fontSize: 14, fontWeight: 700, transition: 'background 0.2s',
          }}
        >
          {saveLabel}
        </button>
      </div>

      <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
        Ajusta cada marco · Pulsa Guardar para aplicar los cambios en producción
      </p>

      <button
        onClick={() => fileRef.current?.click()}
        style={{
          marginBottom: 28, padding: '9px 20px',
          background: '#555', color: '#fff',
          border: 'none', borderRadius: 8,
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}
      >
        📷 Usar mi propia foto
      </button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 24, maxWidth: 1000,
      }}>
        {TIERS.map(({ id, label }) => (
          <FrameEditor
            key={id}
            tierId={id}
            label={label}
            avatar={avatar}
            cfg={cfgs[id]}
            onChange={(newCfg) => setCfgs((prev) => ({ ...prev, [id]: newCfg }))}
          />
        ))}
      </div>

      <p style={{ marginTop: 40, fontSize: 12, color: '#ccc' }}>
        Solo visible en localhost — no aparece en producción.
      </p>
    </div>
  )
}
