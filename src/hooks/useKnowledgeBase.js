import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useKnowledgeBase — hook หลักสำหรับดึง/จัดการ knowledge_base
 * รองรับ: realtime, search, loading states, error handling
 */
export function useKnowledgeBase() {
  const [allNodes, setAllNodes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const channelRef = useRef(null)

  // ── Fetch ──────────────────────────────────────────────
  const fetchKnowledgeBase = useCallback(async (query = '') => {
    setIsLoading(true)
    setError(null)
    try {
      let req = supabase
        .from('knowledge_base')
        .select('*')
        .order('step', { ascending: true })

      if (query.trim()) {
        req = req.ilike('title', `%${query.trim()}%`)
      }

      const { data, error: sbErr } = await req
      if (sbErr) throw sbErr
      setAllNodes(data ?? [])
    } catch (err) {
      console.error('fetchKnowledgeBase error:', err)
      setError(err.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Realtime subscription ──────────────────────────────
  useEffect(() => {
    fetchKnowledgeBase()

    // ✅ cleanup channel เดิมก่อน subscribe ใหม่ (ป้องกัน memory leak)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    channelRef.current = supabase
      .channel('knowledge_base_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'knowledge_base' },
        () => { fetchKnowledgeBase(searchQuery) }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search (debounced 400ms) ───────────────────────────
  useEffect(() => {
    const t = setTimeout(() => fetchKnowledgeBase(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery, fetchKnowledgeBase])

  // ── Insert ────────────────────────────────────────────
  const insertNode = useCallback(async (payload) => {
    const { error: sbErr } = await supabase
      .from('knowledge_base')
      .insert([payload])
    if (sbErr) throw sbErr
  }, [])

  // ── Update ────────────────────────────────────────────
  const updateNode = useCallback(async (id, payload) => {
    const { error: sbErr } = await supabase
      .from('knowledge_base')
      .update(payload)
      .eq('id', id)
    if (sbErr) throw sbErr
  }, [])

  // ── Delete ────────────────────────────────────────────
  const deleteNode = useCallback(async (id) => {
    const { error: sbErr } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)
    if (sbErr) throw sbErr
  }, [])

  return {
    allNodes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchKnowledgeBase,
    insertNode,
    updateNode,
    deleteNode,
  }
}