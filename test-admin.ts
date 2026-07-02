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

import { createClient } from '@supabase/supabase-js'

async function check() {
  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }
    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false }
    });

    console.log("Querying categories with admin client...")
    const { data: categories, error: cErr } = await adminClient.from('categories').select('*')
    if (cErr) console.error("Categories error:", cErr)
    else console.log('Categories count:', categories?.length, categories)

    console.log("Querying profiles with admin client...")
    const { data: profiles, error: pErr } = await adminClient.from('profiles').select('*')
    if (pErr) console.error("Profiles error:", pErr)
    else console.log('Profiles:', profiles)

    console.log("Querying user_roles with admin client...")
    const { data: userRoles, error: urErr } = await adminClient.from('user_roles').select('*')
    if (urErr) console.error("User roles error:", urErr)
    else console.log('User roles:', userRoles)

    console.log("Querying site_settings with admin client...")
    const { data: ss, error: ssErr } = await adminClient.from('site_settings').select('*')
    if (ssErr) console.error("site_settings error:", ssErr)
    else console.log('site_settings:', ss)

    console.log("Querying products with admin client...")
    const { data: products, error: prodErr } = await adminClient.from('products').select('*')
    if (prodErr) console.error("Products error:", prodErr)
    else console.log('Products count:', products?.length, products)

  } catch (err) {
    console.error("Uncaught check error:", err)
  } finally {
    process.exit(0)
  }
}

check()
