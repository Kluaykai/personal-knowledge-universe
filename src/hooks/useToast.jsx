import React, { useState, useCallback } from 'react'

/**
 * useToast — mini toast system (ไม่ต้องลง lib เพิ่ม)
 * ใช้: const { toasts, showToast } = useToast()
 * showToast('บันทึกสำเร็จ', 'success') | 'error' | 'info'
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return { toasts, showToast }
}

/**
 * ToastContainer — วางไว้ใน App root
 */
export function ToastContainer({ toasts }) {
  const colors = {
    success: { bg: '#00ffe7', text: '#000' },
    error:   { bg: '#ff4444', text: '#fff' },
    info:    { bg: '#4444ff', text: '#fff' },
  }
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => {
        const c = colors[t.type] ?? colors.info
        return (
          <div key={t.id} style={{
            background: c.bg, color: c.text,
            padding: '10px 18px', borderRadius: 6, fontSize: 13,
            fontFamily: "'Courier New', monospace", fontWeight: 'bold',
            boxShadow: `0 0 20px ${c.bg}66`,
            animation: 'slideIn 0.25s ease',
          }}>
            {t.message}
          </div>
        )
      })}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  )
}