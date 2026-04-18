import { useState, useMemo, useCallback, useEffect } from 'react'
import GlobeComponent from './components/GlobeComponent'
import AdminModal from './components/AdminModal'
import { useKnowledgeBase } from './hooks/useKnowledgeBase'
import { useToast, ToastContainer } from './hooks/useToast'
import { Settings, RefreshCw, Search, X } from 'lucide-react'
import './index.css'

const ARC_COLORS = { projects: '#00ffe7', areas: '#ffe600', resources: '#ff00c8', journal: '#00ff44', archives: '#555555' }
const getColor = (cat) => ARC_COLORS[cat.toLowerCase()] || '#00ffe7' // ถ้าไม่ใช่ PARA ให้เป็นสีฟ้า

export default function App() {
  const { allNodes, isLoading, error, searchQuery, setSearchQuery, fetchKnowledgeBase } = useKnowledgeBase()
  const { toasts, showToast } = useToast()

  const [activeTab, setActiveTab]   = useState('')
  const [showAdmin, setShowAdmin]   = useState(false)
  const [editNode, setEditNode]     = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  const categories = useMemo(() => {
    return [...new Set(allNodes.map(node => node.category))];
  }, [allNodes]);

  useEffect(() => {
    if (categories.length > 0 && !activeTab) setActiveTab(categories[0]);
  }, [categories, activeTab]);

  const currentPoints = useMemo(
    () => allNodes.filter(n => n.category === activeTab),
    [allNodes, activeTab]
  )

  const arcs = useMemo(() => {
    const color = getColor(activeTab);
    return currentPoints.slice(0, -1).map((p, i) => ({
      id:       `arc-${p.id}`,
      startLat: p.lat,
      startLng: p.lng,
      endLat:   currentPoints[i + 1].lat,
      endLng:   currentPoints[i + 1].lng,
      color,
    }))
  }, [currentPoints, activeTab])

  const openEdit = useCallback((node) => { setEditNode(node); setShowAdmin(true); }, [])
  const openAdd = useCallback(() => { setEditNode(null); setShowAdmin(true); }, [])
  const closeAdmin = useCallback(() => { setShowAdmin(false); setEditNode(null); }, [])

  const activeColor = getColor(activeTab);

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen bg-[#050d1f] overflow-hidden m-0 p-0 relative font-sans text-white">

        {isLoading && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono tracking-widest">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-[#00ffe7] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#00ffe7] animate-pulse text-sm">[ SYNCING UNIVERSE... ]</span>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 text-red-200 px-4 py-2 rounded text-sm font-mono flex items-center gap-3">
            ⚠️ {error}
            <button onClick={() => fetchKnowledgeBase()} className="underline hover:text-white">retry</button>
          </div>
        )}

        {/* Left sidebar */}
        <div className="absolute top-20 left-6 z-40 flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scroll pr-2">
          <p className="text-[#00ffe7] text-[10px] tracking-widest font-mono mb-1 opacity-60">MY_SECOND_BRAIN</p>

          {categories.map(cat => {
            const isTabActive = activeTab === cat;
            const tabColor = getColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-2 text-[11px] font-mono border text-left uppercase transition-all ${
                  isTabActive ? 'bg-white/10 border-current' : 'bg-black/50 border-white/20 text-white/40 hover:border-white/50'
                }`}
                style={ isTabActive ? { color: tabColor, borderColor: tabColor } : {} }
              >
                ▸ {cat}
                {isTabActive && <span className="ml-2 text-[9px] opacity-60">({currentPoints.length})</span>}
              </button>
            );
          })}

          <button onClick={() => setShowSearch(s => !s)} className="mt-2 px-4 py-2 text-[11px] font-mono border border-white/20 text-white/40 hover:border-white/60 flex items-center gap-2 transition-all">
            <Search size={12}/> SEARCH
          </button>

          {showSearch && (
            <div className="relative">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหา title..."
                className="w-full bg-black/60 border border-[#00ffe7]/40 text-[#00ffe7] text-xs font-mono px-3 py-2 outline-none placeholder-white/20"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"><X size={12}/></button>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button onClick={openAdd} className="flex-1 px-4 py-2 flex items-center justify-center gap-1 text-[10px] font-mono border border-[#00ffe7] text-[#00ffe7] bg-[#00ffe7]/10 hover:bg-[#00ffe7]/30 transition-all">
              <Settings size={12}/> NEW_THOUGHT
            </button>
            <button onClick={() => { fetchKnowledgeBase(searchQuery); showToast('รีเฟรชแล้ว', 'info') }} className="px-4 py-2 border border-white/20 text-white/40 hover:text-white transition-all">
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 text-center pointer-events-none">
          <h1 className="text-[11px] font-mono tracking-[0.3em] text-white/20">PERSONAL KNOWLEDGE UNIVERSE</h1>
          {activeTab && (
            <p className="text-[9px] font-mono tracking-widest mt-1 uppercase" style={{ color: activeColor, opacity: 0.7 }}>
              ▸ {activeTab} — {currentPoints.length} NODES
            </p>
          )}
        </div>

        {/* Globe */}
        <GlobeComponent points={currentPoints} arcs={arcs} onEdit={openEdit} />

        {showAdmin && (
          <AdminModal onClose={closeAdmin} onSave={fetchKnowledgeBase} currentCategory={activeTab} editNode={editNode} showToast={showToast} />
        )}
        <ToastContainer toasts={toasts} />
      </div>
    </ErrorBoundary>
  )
}

import { Component } from 'react'
class ErrorBoundary extends Component {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(err) { return { hasError: true, message: err?.message ?? 'Unknown error' } }
  render() {
    if (this.state.hasError) return (
      <div className="w-screen h-screen bg-[#050d1f] flex flex-col items-center justify-center font-mono text-center p-8">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <h2 className="text-red-400 text-xl mb-2">SYSTEM ERROR</h2>
        <p className="text-white/40 text-sm mb-6">{this.state.message}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 border border-[#00ffe7] text-[#00ffe7] hover:bg-[#00ffe7]/10">RESTART SYSTEM</button>
      </div>
    )
    return this.props.children
  }
}