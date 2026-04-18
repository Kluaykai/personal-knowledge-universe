import { useEffect, useRef, useState, useCallback, memo } from 'react'
import Globe from 'react-globe.gl'

// ─────────────────────────────────────────────
// BUG FIX รายการที่แก้:
// 1. globeRef.current.controls() อาจ throw ถ้า Globe ยังไม่ mount
// 2. ResizeObserver ไม่ disconnect ถ้า wrapRef ยังไม่มีค่า
// 3. handlePointClick อ้างอิง wrapRef.current?.getBoundingClientRect() อาจ null
// 4. Popup ไม่ clamp ตำแหน่งแกน Y ด้านล่าง
// 5. selected point อาจ stale หลัง realtime update
// 6. Globe width/height ไม่ sync ทันที
// 7. เพิ่ม Fallback รองรับข้อมูลแบบเก่า (String)
// 8. [อัปเดตล่าสุด] เรียกคืนปุ่ม ✏️ EDIT ในหน้าต่าง Popup กลับมา!
// ─────────────────────────────────────────────

function GlobeComponent({ points = [], arcs = [], onEdit }) {
  const globeRef  = useRef(null)
  const wrapRef   = useRef(null)
  const [dims, setDims]         = useState({ w: 800, h: 600 })
  const [selected, setSelected] = useState(null)
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let timer
    const ro = new ResizeObserver(([entry]) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
      }, 100)
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => { clearTimeout(timer); ro.disconnect() }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      safeControls(globeRef, ctrl => {
        ctrl.autoRotate = true
        ctrl.autoRotateSpeed = 0.4
      })
      try {
        globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1200)
      } catch (_) {}
      setReady(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!selected) return
    const updated = points.find(p => p.id === selected.id)
    if (updated) setSelected(updated)
    else setSelected(null) 
  }, [points]) 

  const handlePointClick = useCallback((point, event) => {
    const rect = wrapRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
    setSelected(point)
    setPopupPos({
      x: (event?.clientX ?? 0) - rect.left,
      y: (event?.clientY ?? 0) - rect.top,
    })
    safeControls(globeRef, ctrl => { ctrl.autoRotate = false })
  }, [])

  const closePopup = useCallback(() => {
    setSelected(null)
    safeControls(globeRef, ctrl => { ctrl.autoRotate = true })
  }, [])

  const handleNavigate = useCallback((direction) => {
    if (!selected) return
    const sorted = [...points].sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
    const idx     = sorted.findIndex(p => p.id === selected.id) 
    const next    = sorted[idx + direction]
    if (!next) return
    setSelected(next)
    try {
      globeRef.current?.pointOfView({ lat: next.lat, lng: next.lng, altitude: 1.8 }, 1000)
    } catch (_) {}
  }, [selected, points])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', height: '100%', minHeight: 480,
        background: 'radial-gradient(ellipse at 50% 60%, #050d1f 0%, #000509 100%)',
        overflow: 'hidden', fontFamily: "'Courier New', monospace",
      }}
    >
      <div style={S.gridOverlay} />
      <div style={S.scanlines} />

      <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 1.2s ease', width: '100%', height: '100%' }}>
        <Globe
          ref={globeRef}
          width={dims.w}
          height={dims.h}
          globeImageUrl="https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg"
          bumpImageUrl="https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#00ffe7"
          atmosphereAltitude={0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => '#00ffe7'}
          pointRadius={0.6}
          pointLabel={p => `<div style="font-family:monospace;font-size:12px;color:#00ffe7;padding:4px 8px;background:rgba(0,8,24,0.85);border:1px solid #00ffe744;border-radius:4px">${p.title}</div>`}
          onPointClick={handlePointClick}
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2400}
          arcStroke={0.5}
        />
      </div>

      {selected && (
        <Popup
          point={selected}
          pos={popupPos}
          containerDims={dims}
          allPoints={points}
          onClose={closePopup}
          onNavigate={handleNavigate}
          onEdit={onEdit} // 🌟 ส่งฟังก์ชัน Edit เข้าไปใน Popup
        />
      )}
    </div>
  )
}

// ── Popup (memoized) ──────────────────────────────────────
const Popup = memo(function Popup({ point, pos, containerDims, allPoints, onClose, onNavigate, onEdit }) {
  const PAD = 16
  const W   = 360
  const H_APPROX = 420

  let left = pos.x + 20
  let top  = pos.y - 150
  if (left + W  > containerDims.w - PAD) left = pos.x - W - 20
  if (left < PAD) left = PAD
  if (top < PAD) top = PAD
  if (top + H_APPROX > containerDims.h - PAD) top = containerDims.h - H_APPROX - PAD

  const sorted     = [...allPoints].sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
  const currentIdx = sorted.findIndex(p => p.id === point.id)
  const total      = sorted.length

  return (
    <div 
      style={{ ...S.popup, left, top, width: W }}
      onPointerDown={e => e.stopPropagation()} 
      onWheel={e => e.stopPropagation()}
    >
      <button onClick={onClose} style={S.popupClose} aria-label="close">✕</button>

      {/* 🌟 Header ที่มีปุ่ม EDIT โผล่มาแล้ว! */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #ffffff18", paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ color: "#00ffe7", fontSize: 15, fontWeight: "bold", paddingRight: 10 }}>
          {point.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginTop: -4 }}>
          <span style={{ color: "#ffe600", fontSize: 10 }}>STEP {point.step} / {total}</span>
          <button
            onClick={() => { if(onEdit) onEdit(point); onClose(); }}
            style={{ background: "none", border: "1px solid #ffe600", borderRadius: 4, color: "#ffe600", cursor: "pointer", fontSize: 10, padding: "2px 6px", transition: "all 0.2s" }}
          >
            ✏️ EDIT
          </button>
        </div>
      </div>

      {/* Content blocks */}
      <div
        className="custom-scroll"
        style={{ color: '#ffffffdd', fontSize: 13, lineHeight: 1.8, maxHeight: 280, overflowY: 'auto', marginBottom: 16, paddingRight: 8, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        {(() => {
          if (Array.isArray(point.content) && point.content.length > 0) {
            return point.content.map((block, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                {block.type === 'text' && (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{block.value}</p>
                )}
                {block.type === 'image' && block.value && (
                  <img
                    src={block.value}
                    alt={`content-${i}`}
                    loading="lazy"
                    style={{ width: '100%', borderRadius: 8, marginTop: 4, border: '1px solid #00ffe744', display: 'block' }}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                )}
              </div>
            ));
          }

          const oldTextData = (typeof point.content === 'string' ? point.content : null) 
                            || point.deep_dive 
                            || point.description;

          if (oldTextData) {
            return (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {String(oldTextData).replace(/\*\*/g, '').replace(/### /g, '📌 ').replace(/`/g, '')}
              </p>
            );
          }

          return <p style={{ margin: 0, color: '#ffffff66', fontStyle: 'italic' }}>ไม่มีเนื้อหา</p>;
        })()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ffffff18', paddingTop: 12 }}>
        <button onClick={() => onNavigate(-1)} disabled={currentIdx <= 0} style={{ ...S.navBtn, opacity: currentIdx <= 0 ? 0.3 : 1 }}>
          ◀ ย้อนกลับ
        </button>
        <button onClick={() => onNavigate(1)} disabled={currentIdx >= total - 1} style={{ ...S.navBtn, opacity: currentIdx >= total - 1 ? 0.3 : 1 }}>
          ถัดไป ▶
        </button>
      </div>
    </div>
  )
})

function safeControls(ref, fn) {
  try {
    if (ref.current?.controls) fn(ref.current.controls())
  } catch (_) {}
}

const S = {
  gridOverlay: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
    backgroundImage: 'linear-gradient(rgba(0,255,231,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,231,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
  },
  popup: {
    position: 'absolute', zIndex: 20,
    background: 'rgba(0,8,24,0.95)', border: '1px solid #00ffe744',
    borderRadius: 8, padding: '20px', backdropFilter: 'blur(10px)',
    boxShadow: '0 0 30px rgba(0,255,231,0.2)',
  },
  popupClose: {
    position: 'absolute', top: 10, right: 12,
    background: 'none', border: 'none', color: '#ffffff44', cursor: 'pointer', fontSize: 16,
  },
  navBtn: {
    background: 'rgba(0,255,231,0.1)', border: '1px solid #00ffe744',
    color: '#00ffe7', padding: '6px 14px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
  },
}

export default memo(GlobeComponent)