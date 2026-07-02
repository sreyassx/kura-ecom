if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    if (err && err.message && err.message.includes('Stream lifetime exceeded')) {
      console.warn('🔔 [Vite SSR] Caught and ignored stream timeout (lifetime exceeded).');
      return;
    }
    console.error('🔥 [Vite SSR] Uncaught Exception:', err);
  });

  // Auto-verify and create storage bucket on startup using service role key
  initStorage();
}

async function initStorage() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn("⚠️ [Vite SSR Storage Auto-Init] SUPABASE_SERVICE_ROLE_KEY is not defined. Storage bucket auto-creation will be skipped.");
    return;
  }

  try {
    // Shim WebSocket to bypass realtime-js instantiation check in Node environment
    if (typeof global !== 'undefined' && !(global as any).WebSocket) {
      (global as any).WebSocket = class {};
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false }
    });

    const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
    if (listError) {
      console.error("❌ [Vite SSR Storage Auto-Init] Failed to list buckets:", listError.message);
      return;
    }

    const hasBucket = buckets?.some((b) => b.name === 'product-images');
    if (!hasBucket) {
      console.log("🚀 [Vite SSR Storage Auto-Init] Bucket 'product-images' not found. Creating public bucket...");
      const { error: createError } = await adminClient.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: ['image/*']
      });

      if (createError) {
        console.error("❌ [Vite SSR Storage Auto-Init] Failed to create bucket:", createError.message);
      } else {
        console.log("✅ [Vite SSR Storage Auto-Init] Public 'product-images' bucket created successfully!");
      }
    } else {
      console.log("🔍 [Vite SSR Storage Auto-Init] Bucket 'product-images' is verified and exists.");
    }
  } catch (err: any) {
    console.error("❌ [Vite SSR Storage Auto-Init] Unexpected error during bucket setup:", err.message || err);
  }
}

import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

export default createStartHandler(defaultStreamHandler)


