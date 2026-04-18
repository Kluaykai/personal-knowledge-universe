import { createClient } from '@supabase/supabase-js'

// ✅ ย้ายออกจาก hardcode → .env.local
// สร้างไฟล์ .env.local แล้วใส่:
// VITE_SUPABASE_URL=https://bamjrgvywehpnvfkqdro.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJhbGci...

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase env vars — ตรวจสอบไฟล์ .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
})