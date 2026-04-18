import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Trash2, Save, X, Plus, Image as ImageIcon, Code, Sparkles } from 'lucide-react'

const EMPTY_FORM = { category: '', step: '', title: '', lat: '', lng: '' }

function validate(form) {
  const errors = {}
  if (!form.category.trim()) errors.category = 'กรอก category'
  if (!form.title.trim())    errors.title    = 'กรอก title'
  return errors
}

export default function AdminModal({ onClose, onSave, currentCategory, editNode = null, showToast }) {
  const isEdit = Boolean(editNode)

  const [formData, setFormData] = useState(
    isEdit
      ? { category: editNode.category, step: String(editNode.step ?? ''), title: editNode.title, lat: String(editNode.lat ?? ''), lng: String(editNode.lng ?? '') }
      : { ...EMPTY_FORM, category: currentCategory || '' }
  )
  const [blocks, setBlocks]         = useState(isEdit ? (editNode.content ?? []) : [])
  const [errors, setErrors]         = useState({})
  const [isSaving, setIsSaving]     = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  // 🌟 AI States
  const [rawAI, setRawAI] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  
  const fileInputRef = useRef(null)

  const setField = (k, v) => setFormData(f => ({ ...f, [k]: v }))

  // 🧠 ฟังก์ชันส่งของให้ AI
  const handleAIProcess = async () => {
    if (!rawAI.trim()) return;
    setIsThinking(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawAI })
      });
      if (!res.ok) throw new Error('AI Error');
      const newBlocks = await res.json();
      
      // เอา Block ที่ AI สร้างมาต่อท้ายของเดิม
      setBlocks(prev => [...prev, ...newBlocks]);
      setRawAI(''); // เคลียร์ช่องพิมพ์
      showToast?.('AI จัดระเบียบเนื้อหาสำเร็จ! ✨', 'success');
    } catch (err) {
      showToast?.('การประมวลผล AI ล้มเหลว โปรดเช็ค API Key', 'error');
    } finally {
      setIsThinking(false);
    }
  }

  const handleImageUpload = useCallback(async (e) => {
    // ... [โค้ดอัปโหลดรูปภาพเหมือนเดิม] ...
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('knowledge-images').upload(fileName, file)
      if (upErr) throw upErr
      const { data } = supabase.storage.from('knowledge-images').getPublicUrl(fileName)
      setBlocks(prev => [...prev, { type: 'image', value: data.publicUrl }])
      showToast?.('อัปโหลดรูปสำเร็จ ✅', 'success')
    } catch (err) {
      showToast?.(err.message ?? 'อัปโหลดล้มเหลว', 'error')
    } finally {
      setIsUploading(false)
    }
  }, [showToast])

  const handleSave = async () => {
    const errs = validate(formData)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setIsSaving(true)

    let finalLat = parseFloat(formData.lat); let finalLng = parseFloat(formData.lng);
    if (isNaN(finalLat) || formData.lat === '') finalLat = 82; 
    if (isNaN(finalLng) || formData.lng === '') finalLng = Math.floor(Math.random() * 61) - 30;

    const payload = {
      category: formData.category.trim().toLowerCase(), 
      step:  formData.step === '' || isNaN(Number(formData.step)) ? 1 : Number(formData.step),
      title: formData.title.trim(), lat: finalLat, lng: finalLng, content: blocks,
    }

    try {
      if (isEdit) { await supabase.from('knowledge_base').update(payload).eq('id', editNode.id) } 
      else { await supabase.from('knowledge_base').insert([payload]) }
      showToast?.('บันทึกสำเร็จ ✅', 'success')
      onSave(); onClose();
    } catch (err) { showToast?.(err.message ?? 'เกิดข้อผิดพลาด', 'error') } 
    finally { setIsSaving(false) }
  }

  const handleDelete = async () => { /* โค้ดเดิม */ setIsSaving(true); try { await supabase.from('knowledge_base').delete().eq('id', editNode.id); showToast?.('ลบสำเร็จ 🗑️', 'info'); onSave(); onClose(); } catch (err) { showToast?.(err.message ?? 'ลบไม่สำเร็จ', 'error') } finally { setIsSaving(false) } }

  const updateBlock = (i, value) => setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, value } : b))
  const removeBlock = (i) => setBlocks(prev => prev.filter((_, idx) => idx !== i))
  const moveBlock   = (i, dir) => { const arr = [...blocks]; const swap = i + dir; if (swap < 0 || swap >= arr.length) return; [arr[i], arr[swap]] = [arr[swap], arr[i]]; setBlocks(arr) }
  const stopProp = (e) => e.stopPropagation();

  return (
    <div className="absolute inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onPointerDown={stopProp} onWheel={stopProp}>
      <div className="bg-[#050d1f] border border-[#00ffe7]/50 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white shadow-[0_0_50px_rgba(0,255,231,0.2)]">

        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-[#00ffe7] tracking-tighter font-mono">{isEdit ? '✏️ EDIT_THOUGHT' : '➕ NEW_THOUGHT'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        {/* ฟอร์มข้อมูลพื้นฐาน */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-sm">
          {[ { key: 'category', span: 1 }, { key: 'step', type: 'number', span: 1 }, { key: 'title', span: 2 }, { key: 'lat', type: 'number', span: 1 }, { key: 'lng', type: 'number', span: 1 } ].map(({ key, type = 'text', span }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="text-[10px] text-[#00ffe7]/70 uppercase mb-1 block">{key}</label>
              <input type={type} className={`w-full bg-black/40 border p-2 text-sm outline-none transition-colors ${errors[key] ? 'border-red-500' : 'border-white/20 focus:border-[#00ffe7]'}`} value={formData[key]} onChange={e => setField(key, e.target.value)} />
            </div>
          ))}
        </div>

        {/* 🌟 โซน AI ASSISTANT ใหม่ 🌟 */}
        <div className="mb-4 p-4 bg-[#00ffe7]/5 border border-[#00ffe7]/20 rounded-lg shadow-[inset_0_0_20px_rgba(0,255,231,0.05)]">
          <p className="text-[#00ffe7] text-xs font-mono mb-2 flex items-center gap-2"><Sparkles size={14}/> AI TEXT & CODE PARSER</p>
          <textarea
            className="w-full bg-black/60 border border-white/10 p-3 text-sm outline-none focus:border-[#00ffe7]/50 min-h-[80px] rounded resize-y placeholder-white/20"
            placeholder="วางข้อความเละๆ หรือ โค้ดที่ปนกับเนื้อหาลงที่นี่... แล้วกดปุ่มให้ AI ชำแหละและแยกกล่องให้"
            value={rawAI} onChange={e => setRawAI(e.target.value)}
          />
          <button onClick={handleAIProcess} disabled={!rawAI.trim() || isThinking} className="mt-3 w-full py-2 bg-[#00ffe7]/10 text-[#00ffe7] text-xs font-mono font-bold border border-[#00ffe7]/40 hover:bg-[#00ffe7]/30 disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
            {isThinking ? <span className="animate-pulse">🧠 กำลังใช้สมองกลวิเคราะห์เนื้อหา...</span> : '🪄 จัดระเบียบข้อความนี้ลง BLOCK'}
          </button>
        </div>

        {/* CONTENT BLOCKS (เหมือนเดิม) */}
        <div className="bg-black/20 p-4 border border-white/10 rounded mb-4">
          <p className="text-white/40 text-[10px] font-mono mb-3">CURRENT_BLOCKS</p>
          {blocks.length === 0 && <p className="text-white/30 text-xs text-center py-4">ยังไม่มี block — ใช้ AI ด้านบน หรือกดเพิ่มด้านล่าง</p>}
          {blocks.map((b, i) => (
            <div key={i} className="flex gap-2 mb-3 bg-white/5 p-2 rounded items-start relative group">
              <div className="flex flex-col gap-1 pt-1">
                <button onClick={() => moveBlock(i, -1)} className="text-white/30 hover:text-white text-xs">▲</button>
                <button onClick={() => moveBlock(i, +1)} className="text-white/30 hover:text-white text-xs">▼</button>
              </div>
              {b.type === 'text' && <textarea className="w-full bg-transparent text-sm min-h-[60px] border-none outline-none resize-y" value={b.value} onChange={e => updateBlock(i, e.target.value)} />}
              {b.type === 'code' && <textarea className="w-full bg-black/60 text-[#00ff44] font-mono text-sm min-h-[80px] p-3 rounded border border-white/10 outline-none resize-y" value={b.value} onChange={e => updateBlock(i, e.target.value)} />}
              {b.type === 'image' && <div className="w-full">{b.value ? <img src={b.value} alt="" className="h-24 rounded border border-[#00ffe7]/30 object-cover" /> : <p className="text-white/30 text-xs">ไม่มี URL</p>}</div>}
              <button onClick={() => removeBlock(i)} className="text-red-400 hover:text-red-300 flex-shrink-0 mt-1"><Trash2 size={15}/></button>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setBlocks(prev => [...prev, { type: 'text', value: '' }])} className="flex-1 py-2 border border-white/10 text-xs hover:bg-white/5 flex items-center justify-center gap-1 transition-colors"><Plus size={12}/> TEXT</button>
            <button onClick={() => setBlocks(prev => [...prev, { type: 'code', value: '' }])} className="flex-1 py-2 border border-white/10 text-[#00ff44] hover:bg-white/5 flex items-center justify-center gap-1 transition-colors"><Code size={12}/> CODE</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1 py-2 border border-white/10 text-xs hover:bg-white/5 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"><ImageIcon size={12}/> IMAGE</button>
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-[#00ffe7] text-black font-bold uppercase tracking-widest hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 font-mono text-sm transition-all"><Save size={16}/> SAVE_TO_UNIVERSE</button>
          {isEdit && !confirmDelete && <button onClick={() => setConfirmDelete(true)} className="px-4 py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10"><Trash2 size={16}/></button>}
          {isEdit && confirmDelete && <button onClick={handleDelete} disabled={isSaving} className="px-4 py-3 bg-red-500 text-white font-bold">ยืนยันลบ?</button>}
        </div>
      </div>
    </div>
  )
}