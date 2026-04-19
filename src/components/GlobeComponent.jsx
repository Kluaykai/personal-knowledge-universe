import { useEffect, useRef, useState, useCallback, memo } from 'react'
import Globe from 'react-globe.gl'
import { Copy, CheckCircle, BookOpen, Maximize2, Minimize2 } from 'lucide-react' // 🌟 นำเข้า Icon เพิ่ม

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
      timer = setTimeout(() => { setDims({ w: entry.contentRect.width, h: entry.contentRect.height }) }, 100)
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => { clearTimeout(timer); ro.disconnect() }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      safeControls(globeRef, ctrl => { ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.4 })
      try { globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1200) } catch (_) {}
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
    setPopupPos({ x: (event?.clientX ?? 0) - rect.left, y: (event?.clientY ?? 0) - rect.top })
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
    try { globeRef.current?.pointOfView({ lat: next.lat, lng: next.lng, altitude: 1.8 }, 1000) } catch (_) {}
  }, [selected, points])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480, background: 'radial-gradient(ellipse at 50% 60%, #050d1f 0%, #000509 100%)', overflow: 'hidden', fontFamily: "'Courier New', monospace" }}>
      <div style={S.gridOverlay} />
      <div style={S.scanlines} />

      <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 1.2s ease', width: '100%', height: '100%' }}>
        <Globe
          ref={globeRef} width={dims.w} height={dims.h}
          globeImageUrl="https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg"
          bumpImageUrl="https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)" atmosphereColor="#00ffe7" atmosphereAltitude={0.18}
          pointsData={points} pointLat="lat" pointLng="lng" pointColor={() => '#00ffe7'} pointRadius={0.6}
          pointLabel={p => `<div style="font-family:monospace;font-size:12px;color:#00ffe7;padding:4px 8px;background:rgba(0,8,24,0.85);border:1px solid #00ffe744;border-radius:4px">${p.title}</div>`}
          onPointClick={handlePointClick}
          arcsData={arcs} arcStartLat="startLat" arcStartLng="startLng" arcEndLat="endLat" arcEndLng="endLng"
          arcColor="color" arcDashLength={0.4} arcDashGap={0.2} arcDashAnimateTime={2400} arcStroke={0.5}
        />
      </div>

      {selected && <Popup point={selected} pos={popupPos} containerDims={dims} allPoints={points} onClose={closePopup} onNavigate={handleNavigate} onEdit={onEdit} />}
    </div>
  )
}

const Popup = memo(function Popup({ point, pos, containerDims, allPoints, onClose, onNavigate, onEdit }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isReadMode, setIsReadMode] = useState(false); // 🌟 State ควบคุมโหมดอ่าน

  const PAD = 16; const W = 380; const H_APPROX = 420;
  let left = pos.x + 20; let top = pos.y - 150
  if (left + W > containerDims.w - PAD) left = pos.x - W - 20
  if (left < PAD) left = PAD; if (top < PAD) top = PAD
  if (top + H_APPROX > containerDims.h - PAD) top = containerDims.h - H_APPROX - PAD

  const sorted = [...allPoints].sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
  const currentIdx = sorted.findIndex(p => p.id === point.id)
  const total = sorted.length

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 🌟 ฟังก์ชันเรนเดอร์เนื้อหา (ใช้ร่วมกันทั้งหน้าต่างเล็กและโหมดอ่าน)
  const renderContent = (isLargeText = false) => {
    if (Array.isArray(point.content) && point.content.length > 0) {
      return point.content.map((block, i) => (
        <div key={i} style={{ marginBottom: isLargeText ? 24 : 12 }}>
          {block.type === 'text' && (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: isLargeText ? '15px' : '13px', lineHeight: isLargeText ? '1.8' : '1.6', color: isLargeText ? '#ffffff' : '#ffffffdd' }}>
              {block.value}
            </p>
          )}
          
          {block.type === 'code' && (
            <div style={{ position: 'relative', background: '#00000088', border: '1px solid #ffffff22', borderRadius: 8, padding: isLargeText ? '16px' : '12px', marginTop: 8 }}>
              <button onClick={() => handleCopy(block.value, i)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: copiedIndex === i ? '#00ff44' : '#ffffff66', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                {copiedIndex === i ? <><CheckCircle size={14} /> COPIED</> : <><Copy size={14} /> COPY</>}
              </button>
              <pre className="custom-scroll" style={{ margin: 0, color: '#00ff44', fontFamily: 'monospace', fontSize: isLargeText ? '14px' : '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', paddingTop: 14 }}>
                {block.value}
              </pre>
            </div>
          )}

          {block.type === 'image' && block.value && <img src={block.value} alt={`content-${i}`} loading="lazy" style={{ width: '100%', borderRadius: 8, marginTop: 8, border: '1px solid #00ffe744', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />}
        </div>
      ));
    }
    return <p style={{ margin: 0, color: '#ffffff66', fontStyle: 'italic' }}>ไม่มีเนื้อหา</p>;
  };

  // 📖 หน้าต่างโหมดอ่าน (Read Mode Overlay)
  if (isReadMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 5, 9, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', padding: '40px 20px' }} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
        <div className="custom-scroll" style={{ background: '#050d1f', border: '1px solid #00ffe766', borderRadius: 12, width: '100%', maxWidth: '800px', height: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '40px', boxShadow: '0 0 50px rgba(0,255,231,0.1)' }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #ffffff22", paddingBottom: 20, marginBottom: 24 }}>
            <div>
              <span style={{ color: "#00ffe7", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{point.category}</span>
              <h1 style={{ color: "#ffffff", fontSize: 28, fontWeight: "bold", margin: '8px 0 0 0' }}>{point.title}</h1>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { if(onEdit) onEdit(point); setIsReadMode(false); }} style={{ background: "none", border: "1px solid #ffe600", borderRadius: 6, color: "#ffe600", cursor: "pointer", fontSize: 12, padding: "6px 12px", fontFamily: 'monospace' }}>✏️ EDIT</button>
              <button onClick={() => setIsReadMode(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "#ffffff", cursor: "pointer", fontSize: 12, padding: "6px 12px", display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace' }}><Minimize2 size={14}/> CLOSE</button>
            </div>
          </div>

          <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            {renderContent(true)}
          </div>

        </div>
      </div>
    );
  }

  // 🌍 หน้าต่าง Popup เล็กบนลูกโลก (โหมดปกติ)
  return (
    <div style={{ ...S.popup, left, top, width: W }} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
      <button onClick={onClose} style={S.popupClose} aria-label="close">✕</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #ffffff18", paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ color: "#00ffe7", fontSize: 15, fontWeight: "bold", paddingRight: 10 }}>{point.title}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginTop: -4 }}>
          <span style={{ color: "#ffe600", fontSize: 10 }}>STEP {point.step} / {total}</span>
          <button onClick={() => setIsReadMode(true)} style={{ background: "rgba(0,255,231,0.1)", border: "1px solid #00ffe7", borderRadius: 4, color: "#00ffe7", cursor: "pointer", fontSize: 10, padding: "2px 6px", display: 'flex', alignItems: 'center', gap: 4 }}><Maximize2 size={10}/> READ MODE</button>
        </div>
      </div>

      <div className="custom-scroll" style={{ color: '#ffffffdd', fontSize: 13, lineHeight: 1.6, maxHeight: 240, overflowY: 'auto', marginBottom: 16, paddingRight: 8, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        {renderContent(false)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ffffff18', paddingTop: 12 }}>
        <button onClick={() => onNavigate(-1)} disabled={currentIdx <= 0} style={{ ...S.navBtn, opacity: currentIdx <= 0 ? 0.3 : 1 }}>◀ ย้อนกลับ</button>
        <button onClick={() => onNavigate(1)} disabled={currentIdx >= total - 1} style={{ ...S.navBtn, opacity: currentIdx >= total - 1 ? 0.3 : 1 }}>ถัดไป ▶</button>
      </div>
    </div>
  )
})

function safeControls(ref, fn) { try { if (ref.current?.controls) fn(ref.current.controls()) } catch (_) {} }

const S = {
  gridOverlay: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: 'linear-gradient(rgba(0,255,231,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,231,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' },
  scanlines: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' },
  popup: { position: 'absolute', zIndex: 20, background: 'rgba(0,8,24,0.95)', border: '1px solid #00ffe744', borderRadius: 8, padding: '20px', backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(0,255,231,0.2)' },
  popupClose: { position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#ffffff44', cursor: 'pointer', fontSize: 16 },
  navBtn: { background: 'rgba(0,255,231,0.1)', border: '1px solid #00ffe744', color: '#00ffe7', padding: '6px 14px', borderRadius: 4, fontSize: 10, cursor: 'pointer' },
}

export default memo(GlobeComponent)import { useEffect, useRef, useState, useCallback, memo } from 'react'
import Globe from 'react-globe.gl'
import { Copy, CheckCircle, Maximize2, Minimize2 } from 'lucide-react'

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
      timer = setTimeout(() => { setDims({ w: entry.contentRect.width, h: entry.contentRect.height }) }, 100)
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => { clearTimeout(timer); ro.disconnect() }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      safeControls(globeRef, ctrl => { ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.4 })
      try { globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1200) } catch (_) {}
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
    setPopupPos({ x: (event?.clientX ?? 0) - rect.left, y: (event?.clientY ?? 0) - rect.top })
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
    try { globeRef.current?.pointOfView({ lat: next.lat, lng: next.lng, altitude: 1.8 }, 1000) } catch (_) {}
  }, [selected, points])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480, background: 'radial-gradient(ellipse at 50% 60%, #050d1f 0%, #000509 100%)', overflow: 'hidden', fontFamily: "'Courier New', monospace" }}>
      <div style={S.gridOverlay} />
      <div style={S.scanlines} />
      <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 1.2s ease', width: '100%', height: '100%' }}>
        <Globe
          ref={globeRef} width={dims.w} height={dims.h}
          globeImageUrl="https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg"
          bumpImageUrl="https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)" atmosphereColor="#00ffe7" atmosphereAltitude={0.18}
          pointsData={points} pointLat="lat" pointLng="lng" pointColor={() => '#00ffe7'} pointRadius={0.6}
          pointLabel={p => `<div style="font-family:monospace;font-size:12px;color:#00ffe7;padding:4px 8px;background:rgba(0,8,24,0.85);border:1px solid #00ffe744;border-radius:4px">${p.title}</div>`}
          onPointClick={handlePointClick}
          arcsData={arcs} arcStartLat="startLat" arcStartLng="startLng" arcEndLat="endLat" arcEndLng="endLng"
          arcColor="color" arcDashLength={0.4} arcDashGap={0.2} arcDashAnimateTime={2400} arcStroke={0.5}
        />
      </div>
      {selected && <Popup point={selected} pos={popupPos} containerDims={dims} allPoints={points} onClose={closePopup} onNavigate={handleNavigate} onEdit={onEdit} />}
    </div>
  )
}

const Popup = memo(function Popup({ point, pos, containerDims, allPoints, onClose, onNavigate, onEdit }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isReadMode, setIsReadMode] = useState(false); 

  const PAD = 16; const W = 380; const H_APPROX = 420;
  let left = pos.x + 20; let top = pos.y - 150
  if (left + W > containerDims.w - PAD) left = pos.x - W - 20
  if (left < PAD) left = PAD; if (top < PAD) top = PAD
  if (top + H_APPROX > containerDims.h - PAD) top = containerDims.h - H_APPROX - PAD

  const sorted = [...allPoints].sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
  const currentIdx = sorted.findIndex(p => p.id === point.id)
  const total = sorted.length

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 🌟 ฟังก์ชันเรนเดอร์ (แก้ไขให้รองรับข้อมูลยุคเก่าแล้ว!)
  const renderContent = (isLargeText = false) => {
    // 1. ถ้าข้อมูลเก่าเป็น String ธรรมดา ให้แสดงผลได้เลย
    if (typeof point.content === 'string') {
      return <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: isLargeText ? '15px' : '13px', lineHeight: isLargeText ? '1.8' : '1.6', color: isLargeText ? '#ffffff' : '#ffffffdd' }}>{point.content}</p>;
    }

    // 2. ถ้าเป็นข้อมูลยุคใหม่ (Array Blocks)
    if (Array.isArray(point.content) && point.content.length > 0) {
      return point.content.map((block, i) => (
        <div key={i} style={{ marginBottom: isLargeText ? 24 : 12 }}>
          {block.type === 'text' && (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: isLargeText ? '15px' : '13px', lineHeight: isLargeText ? '1.8' : '1.6', color: isLargeText ? '#ffffff' : '#ffffffdd' }}>
              {block.value}
            </p>
          )}
          {block.type === 'code' && (
            <div style={{ position: 'relative', background: '#00000088', border: '1px solid #ffffff22', borderRadius: 8, padding: isLargeText ? '16px' : '12px', marginTop: 8 }}>
              <button onClick={() => handleCopy(block.value, i)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: copiedIndex === i ? '#00ff44' : '#ffffff66', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                {copiedIndex === i ? <><CheckCircle size={14} /> COPIED</> : <><Copy size={14} /> COPY</>}
              </button>
              <pre className="custom-scroll" style={{ margin: 0, color: '#00ff44', fontFamily: 'monospace', fontSize: isLargeText ? '14px' : '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', paddingTop: 14 }}>
                {block.value}
              </pre>
            </div>
          )}
          {block.type === 'image' && block.value && <img src={block.value} alt={`content-${i}`} loading="lazy" style={{ width: '100%', borderRadius: 8, marginTop: 8, border: '1px solid #00ffe744', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />}
        </div>
      ));
    }
    return <p style={{ margin: 0, color: '#ffffff66', fontStyle: 'italic' }}>ไม่มีเนื้อหา</p>;
  };

  if (isReadMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 5, 9, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', padding: '40px 20px' }} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
        <div className="custom-scroll" style={{ background: '#050d1f', border: '1px solid #00ffe766', borderRadius: 12, width: '100%', maxWidth: '800px', height: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '40px', boxShadow: '0 0 50px rgba(0,255,231,0.1)' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #ffffff22", paddingBottom: 20, marginBottom: 24 }}>
            <div>
              <span style={{ color: "#00ffe7", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{point.category}</span>
              <h1 style={{ color: "#ffffff", fontSize: 28, fontWeight: "bold", margin: '8px 0 0 0' }}>{point.title}</h1>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { if(onEdit) onEdit(point); setIsReadMode(false); }} style={{ background: "none", border: "1px solid #ffe600", borderRadius: 6, color: "#ffe600", cursor: "pointer", fontSize: 12, padding: "6px 12px", fontFamily: 'monospace' }}>✏️ EDIT</button>
              <button onClick={() => setIsReadMode(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "#ffffff", cursor: "pointer", fontSize: 12, padding: "6px 12px", display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace' }}><Minimize2 size={14}/> CLOSE</button>
            </div>
          </div>
          <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>{renderContent(true)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S.popup, left, top, width: W }} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
      <button onClick={onClose} style={S.popupClose} aria-label="close">✕</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #ffffff18", paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ color: "#00ffe7", fontSize: 15, fontWeight: "bold", paddingRight: 10 }}>{point.title}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginTop: -4 }}>
          <span style={{ color: "#ffe600", fontSize: 10 }}>STEP {point.step} / {total}</span>
          <button onClick={() => setIsReadMode(true)} style={{ background: "rgba(0,255,231,0.1)", border: "1px solid #00ffe7", borderRadius: 4, color: "#00ffe7", cursor: "pointer", fontSize: 10, padding: "2px 6px", display: 'flex', alignItems: 'center', gap: 4 }}><Maximize2 size={10}/> READ MODE</button>
        </div>
      </div>
      <div className="custom-scroll" style={{ color: '#ffffffdd', fontSize: 13, lineHeight: 1.6, maxHeight: 240, overflowY: 'auto', marginBottom: 16, paddingRight: 8, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        {renderContent(false)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ffffff18', paddingTop: 12 }}>
        <button onClick={() => onNavigate(-1)} disabled={currentIdx <= 0} style={{ ...S.navBtn, opacity: currentIdx <= 0 ? 0.3 : 1 }}>◀ ย้อนกลับ</button>
        <button onClick={() => onNavigate(1)} disabled={currentIdx >= total - 1} style={{ ...S.navBtn, opacity: currentIdx >= total - 1 ? 0.3 : 1 }}>ถัดไป ▶</button>
      </div>
    </div>
  )
})

function safeControls(ref, fn) { try { if (ref.current?.controls) fn(ref.current.controls()) } catch (_) {} }

const S = {
  gridOverlay: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: 'linear-gradient(rgba(0,255,231,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,231,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' },
  scanlines: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' },
  popup: { position: 'absolute', zIndex: 20, background: 'rgba(0,8,24,0.95)', border: '1px solid #00ffe744', borderRadius: 8, padding: '20px', backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(0,255,231,0.2)' },
  popupClose: { position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#ffffff44', cursor: 'pointer', fontSize: 16 },
  navBtn: { background: 'rgba(0,255,231,0.1)', border: '1px solid #00ffe744', color: '#00ffe7', padding: '6px 14px', borderRadius: 4, fontSize: 10, cursor: 'pointer' },
}

export default memo(GlobeComponent)