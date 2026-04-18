import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Trash2, Save, X, Plus, Image as ImageIcon, Code, Sparkles, Wand2 } from 'lucide-react'

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

  // 🧠 ฟังก์ชันส่งของให้ AI
  const handleAIProcess = async (textToProcess = null) => {
    const targetText = textToProcess || rawAI;
    if (!targetText.trim()) return;
    
    setIsThinking(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: targetText })
      });
      if (!res.ok) throw new Error('AI Error');
      const newBlocks = await res.json();
      
      // ถ้าเป็นโหมดแก้ และเลือกประมวลผลใหม่ ให้ถามหรือแทนที่
      setBlocks(prev => [...prev, ...newBlocks]);
      setRawAI(''); 
      showToast?.('AI จัดระเบียบเนื้อหาให้ใหม่แล้ว ✨', 'success');
    } catch (err) {
      showToast?.('AI ล้มเหลว เช็ค API Key ใน Vercel นะครับ', 'error');
    } finally {
      setIsThinking(false);
    }
  }

  // 🔄 ดึงข้อความจาก Block ทั้งหมดกลับมาใส่ช่อง AI เพื่อประมวลผลใหม่
  const loadExistingToAI = () => {
    const textOnly = blocks
      .filter(b => b.type === 'text' || b.type === 'code')
      .map(b => b.value)
      .join('\n\n');
    setRawAI(textOnly);
    showToast?.('ดึงข้อมูลเดิมมาที่ช่อง AI แล้ว', 'info');
  }

  const setField = (k, v) => setFormData(f => ({ ...f, [k]: v }))

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
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
      if (isEdit) {
        const { error } = await supabase.from('knowledge_base').update(payload).eq('id', editNode.id)
        if (error) throw error
        showToast?.('อัปเดตจักรวาลสำเร็จ 🚀', 'success')
      } else {
        const { error } = await supabase.from('knowledge_base').insert([payload])
        if (error) throw error
        showToast?.('บันทึกสำเร็จ ✅', 'success')
      }
      onSave(); onClose();
    } catch (err) { showToast?.(err.message ?? 'เกิดข้อผิดพลาด', 'error') } 
    finally { setIsSaving(false) }
  }

  const handleDelete = async () => {
    setIsSaving(true); 
    try { 
      await supabase.from('knowledge_base').delete().eq('id', editNode.id); 
      showToast?.('ลบข้อมูลออกจากโลกแล้ว 🗑️', 'info'); 
      onSave(); onClose(); 
    } catch (err) { showToast?.('ลบไม่สำเร็จ', 'error') } 
    finally { setIsSaving(false) }
  }

  const updateBlock = (i, value) => setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, value } : b))
  const removeBlock = (i) => setBlocks(prev => prev.filter((_, idx) => idx !== i))
  const moveBlock   = (i, dir) => { const arr = [...blocks]; const swap = i + dir; if (swap < 0 || swap >= arr.length) return; [arr[i], arr[swap]] = [arr[swap], arr[i]]; setBlocks(arr) }
  const stopProp = (e) => e.stopPropagation();

  return (
    <div className="absolute inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onPointerDown={stopProp} onWheel={stopProp}>
      <div className="bg-[#050d1f] border border-[#00ffe7]/50 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white shadow-[0_0_50px_rgba(0,255,231,0.2)]">

        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-[#00ffe7] tracking-tighter font-mono">
            {isEdit ? '✏️ EDIT_THOUGHT' : '➕ NEW_THOUGHT'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-sm">
          {[ { key: 'category' }, { key: 'step', type: 'number' }, { key: 'title', span: 2 }, { key: 'lat', type: 'number' }, { key: 'lng', type: 'number' } ].map(({ key, type = 'text', span }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="text-[10px] text-[#00ffe7]/70 uppercase mb-1 block">{key}</label>
              <input type={type} className="w-full bg-black/40 border border-white/20 p-2 text-sm outline-none focus:border-[#00ffe7]" value={formData[key]} onChange={e => setField(key, e.target.value)} />
            </div>
          ))}
        </div>

        {/* 🌟 AI ASSISTANT ZONE 🌟 */}
        <div className="mb-6 p-4 bg-[#00ffe7]/5 border border-[#00ffe7]/30 rounded-lg relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[#00ffe7] text-xs font-mono flex items-center gap-2"><Sparkles size={14}/> AI SMART PARSER</p>
            {isEdit && (
              <button onClick={loadExistingToAI} className="text-[10px] text-[#ffe600] border border-[#ffe600]/30 px-2 py-1 rounded hover:bg-[#ffe600]/10 flex items-center gap-1 transition-all">
                <Wand2 size={10}/> LOAD CURRENT TEXT
              </button>
            )}
          </div>
          <textarea
            className="w-full bg-black/60 border border-white/10 p-3 text-sm outline-none focus:border-[#00ffe7]/50 min-h-[100px] rounded resize-y font-sans leading-relaxed"
            placeholder="วางเนื้อหาดิบๆ ลงที่นี่... แล้วให้ AI ช่วยจัดระเบียบแยกหัวข้อและโค้ดให้สวยงาม"
            value={rawAI} onChange={e => setRawAI(e.target.value)}
          />
          <button onClick={() => handleAIProcess()} disabled={!rawAI.trim() || isThinking} className="mt-3 w-full py-2 bg-[#00ffe7] text-black text-xs font-bold border-none hover:brightness-110 disabled:opacity-30 transition-all flex justify-center items-center gap-2 rounded">
            {isThinking ? <span className="animate-pulse">🧠 กำลังคิดวิเคราะห์...</span> : <><Sparkles size={14}/> {isEdit ? 'RE-PROCESS WITH AI' : 'PROCESS TO BLOCKS'}</>}
          </button>
        </div>

        {/* Blocks Management */}
        <div className="bg-black/20 p-4 border border-white/10 rounded mb-6">
          <p className="text-white/40 text-[10px] font-mono mb-3 uppercase tracking-widest">Thought Structure</p>
          {blocks.length === 0 && <p className="text-white/20 text-xs text-center py-6 border border-dashed border-white/10 rounded">ยังไม่มีข้อมูลเนื้อหา</p>}
          {blocks.map((b, i) => (
            <div key={i} className="flex gap-2 mb-3 bg-white/5 p-2 rounded group border border-white/5 hover:border-[#00ffe7]/20 transition-all">
              <div className="flex flex-col gap-1">
                <button onClick={() => moveBlock(i, -1)} className="text-white/20 hover:text-white text-[10px]">▲</button>
                <button onClick={() => moveBlock(i, +1)} className="text-white/20 hover:text-white text-[10px]">▼</button>
              </div>
              {b.type === 'text' && <textarea className="w-full bg-transparent text-sm min-h-[50px] border-none outline-none resize-y" value={b.value} onChange={e => updateBlock(i, e.target.value)} />}
              {b.type === 'code' && <textarea className="w-full bg-black/40 text-[#00ff44] font-mono text-sm min-h-[60px] p-2 border-none outline-none resize-y" value={b.value} onChange={e => updateBlock(i, e.target.value)} />}
              {b.type === 'image' && <div className="w-full py-1">{b.value ? <img src={b.value} alt="" className="h-20 rounded object-cover" /> : 'No URL'}</div>}
              <button onClick={() => removeBlock(i)} className="text-red-900 group-hover:text-red-500 transition-colors self-start mt-1"><Trash2 size={14}/></button>
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setBlocks(prev => [...prev, { type: 'text', value: '' }])} className="flex-1 py-1.5 border border-white/10 text-[11px] hover:bg-white/5 flex items-center justify-center gap-1"><Plus size={12}/> TEXT</button>
            <button onClick={() => setBlocks(prev => [...prev, { type: 'code', value: '' }])} className="flex-1 py-1.5 border border-white/10 text-[11px] text-[#00ff44] hover:bg-white/5 flex items-center justify-center gap-1"><Code size={12}/> CODE</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1 py-1.5 border border-white/10 text-[11px] hover:bg-white/5 flex items-center justify-center gap-1">
              <ImageIcon size={12}/> {isUploading ? 'WAIT...' : 'IMG'}
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-3 bg-[#00ffe7] text-black font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
            <Save size={18}/> {isSaving ? 'SAVING...' : isEdit ? 'UPDATE_UNIVERSE' : 'CREATE_NEW_THOUGHT'}
          </button>
          {isEdit && (
            <div className="flex flex-1 gap-2">
               {!confirmDelete ? (
                 <button onClick={() => setConfirmDelete(true)} className="w-full border border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center justify-center"><Trash2 size={18}/></button>
               ) : (
                 <button onClick={handleDelete} disabled={isSaving} className="w-full bg-red-600 text-white text-[10px] font-bold uppercase hover:bg-red-700">CONFIRM DELETE?</button>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}