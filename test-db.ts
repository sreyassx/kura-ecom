import fs from 'fs'
import path from 'path'

// Load .env manually
try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8')
    for (const line of envConfig.split('\n')) {
      const parts = line.split('=')
      if (parts.length >= 2) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && !process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
} catch (e) {
  console.error("Error loading .env manually:", e)
}

// Shim WebSocket to bypass realtime-js instantiation check in Node environment
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

import { supabase } from './src/integrations/supabase/client'

async function check() {
  try {
    console.log("Querying categories...")
    const { data: categories, error: cErr } = await supabase.from('categories').select('*')
    if (cErr) console.error("Categories error:", cErr)
    else console.log('Categories count:', categories?.length)

    console.log("Querying profiles...")
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1)
    if (pErr) console.error("Profiles error:", pErr)
    else {
      console.log('Profiles structure:', profiles)
    }

    console.log("Querying site_settings...")
    const { data: ss, error: ssErr } = await supabase.from('site_settings').select('*').limit(1)
    console.log("site_settings result:", ss, ssErr)

    console.log("Querying homepage_content...")
    const { data: hc, error: hcErr } = await supabase.from('homepage_content').select('*').limit(1)
    console.log("homepage_content result:", hc, hcErr)

    console.log("Querying products...")
    const { data: products, error: prodErr } = await supabase.from('products').select('*').limit(5)
    if (prodErr) console.error("Products error:", prodErr)
    else {
      console.log('Products:', products)
    }
  } catch (err) {
    console.error("Uncaught check error:", err)
  } finally {
    process.exit(0)
  }
}

check()

