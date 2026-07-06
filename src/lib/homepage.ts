import { createServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { attachSupabaseAuth } from './auth-attacher'
import { requireSupabaseAuth } from './auth-middleware'


export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface HomepageConfig {
  badge: string;
  headline: string;
  subheading: string;
  trust_indicators: string[];
  announcement_bar: string;
  // branding / customizations
  store_name: string;
  store_description: string;
  store_logo_url: string;
  contact_email: string;
  contact_phone: string;
  delivery_policy: string;
  return_policy: string;
  faq_items: FAQItem[];
}

export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
})

export const siteSettingsSchema = z.object({
  badge: z.string(),
  headline: z.string(),
  subheading: z.string(),
  trust_indicators: z.array(z.string()),
  announcement_bar: z.string(),
  // branding / customizations
  store_name: z.string(),
  store_description: z.string(),
  store_logo_url: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  delivery_policy: z.string(),
  return_policy: z.string(),
  faq_items: z.array(faqItemSchema),
})

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[getSupabaseClient] Configured URL:", url, "Has serviceKey:", !!serviceKey);

  if (url && serviceKey) {
    if (typeof globalThis !== 'undefined' && !(globalThis as any).WebSocket) {
      (globalThis as any).WebSocket = class {};
    }
    return createClient(url, serviceKey, {
      auth: { persistSession: false }
    });
  }
  console.log("[getSupabaseClient] Falling back to standard anonymous supabase client");
  return supabase;
}

export const getHomepageConfig = createServerFn({ method: 'POST' })
  .handler(async (): Promise<HomepageConfig> => {
    console.log("[getHomepageConfig] server function invoked");
    const safeJsonParse = (value: any) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    try {
      const client = getSupabaseClient();
      console.log("[getHomepageConfig] Querying site_settings table...");
      const { data: dbData, error } = await client
        .from('site_settings')
        .select('*');

      console.log("[getHomepageConfig] site_settings query result. Data count:", dbData ? dbData.length : 'null', "Error:", error);

      if (error) {
        console.error("[getHomepageConfig] Supabase query error:", error);
      }

      if (!error && dbData && dbData.length > 0) {
        const config: HomepageConfig = {
          badge: "Welcome to Kura",
          headline: "Curated Drops Daily.",
          subheading: "Hand-picked viral gadgets, premium streetwear, and everyday essentials chosen for quality and design.",
          trust_indicators: ["Verified Quality", "Fast Shipping", "Easy Returns"],
          announcement_bar: "Free shipping on orders above ₹999",
          store_name: "Kura",
          store_description: "Hand-picked viral gadgets, premium streetwear, and everyday essentials.",
          store_logo_url: "",
          contact_email: "support@kura.com",
          contact_phone: "+91 98765 43210",
          delivery_policy: "Free shipping on orders above ₹999",
          return_policy: "14-day return and replacement policy.",
          faq_items: [
            {
              id: "1",
              question: "How long does shipping take?",
              answer: "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping is automatically applied to orders over ₹999.",
            },
            {
              id: "2",
              question: "Can I return a product?",
              answer: "Yes, we accept returns within 14 days of delivery. The item must be unused, in its original packaging, and with all tags intact.",
            },
            {
              id: "3",
              question: "How do I track my order status?",
              answer: "Go to your Orders page by tapping the Orders tile in your Account, or by navigating to /orders. There, you can view the status of each order: Placed, Shipped, or Delivered.",
            },
            {
              id: "4",
              question: "Who is the seller on Kura?",
              answer: "Kura is a single-seller boutique, meaning all products are directly handpicked, verified, and shipped by me (the store owner). This guarantees consistent quality and support.",
            }
          ]
        };

        for (const row of dbData) {
          if (row.key === 'homepage_hero') {
            const val = safeJsonParse(row.value);
            if (val) {
              if (val.badge) config.badge = val.badge;
              if (val.headline) config.headline = val.headline;
              if (val.subheading) config.subheading = val.subheading;
            }
          } else if (row.key === 'trust_indicators') {
            const val = safeJsonParse(row.value);
            if (Array.isArray(val)) config.trust_indicators = val;
          } else if (row.key === 'announcement_bar') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.announcement_bar = val;
          } else if (row.key === 'store_name') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.store_name = val;
          } else if (row.key === 'store_description') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.store_description = val;
          } else if (row.key === 'store_logo_url') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.store_logo_url = val;
          } else if (row.key === 'contact_email') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.contact_email = val;
          } else if (row.key === 'contact_phone') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.contact_phone = val;
          } else if (row.key === 'delivery_policy') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.delivery_policy = val;
          } else if (row.key === 'return_policy') {
            const val = safeJsonParse(row.value);
            if (val && typeof val === 'string') config.return_policy = val;
          } else if (row.key === 'faq_items') {
            const val = safeJsonParse(row.value);
            if (Array.isArray(val)) config.faq_items = val;
          }
        }

        console.log("[getHomepageConfig] Successfully mapped data from database. Store name:", config.store_name);
        return config;
      } else {
        console.warn("[getHomepageConfig] site_settings query returned no rows or had error. Length:", dbData ? dbData.length : 'undefined');
      }
    } catch (e) {
      console.warn("Failed to read site_settings from Supabase, falling back to local file:", e);
    }

    try {
      const fs = await import('fs');
      const { join } = await import('path');
      const CONFIG_PATH = join(process.cwd(), 'src/homepage-config.json');
      const data = await fs.promises.readFile(CONFIG_PATH, 'utf-8')
      const parsed = JSON.parse(data);
      return {
        badge: parsed?.badge || "Welcome to Kura",
        headline: parsed?.headline || "Curated Drops Daily.",
        subheading: parsed?.subheading || "Hand-picked viral gadgets, premium streetwear, and everyday essentials chosen for quality and design.",
        trust_indicators: Array.isArray(parsed?.trust_indicators) ? parsed.trust_indicators : ["Verified Quality", "Fast Shipping", "Easy Returns"],
        announcement_bar: parsed?.announcement_bar || "Free shipping on orders above ₹999",
        store_name: parsed?.store_name || "Kura",
        store_description: parsed?.store_description || "Hand-picked viral gadgets, premium streetwear, and everyday essentials.",
        store_logo_url: parsed?.store_logo_url || "",
        contact_email: parsed?.contact_email || "support@kura.com",
        contact_phone: parsed?.contact_phone || "+91 98765 43210",
        delivery_policy: parsed?.delivery_policy || "Free shipping on orders above ₹999",
        return_policy: parsed?.return_policy || "14-day return and replacement policy.",
        faq_items: Array.isArray(parsed?.faq_items) ? parsed.faq_items : [
          {
            id: "1",
            question: "How long does shipping take?",
            answer: "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping is automatically applied to orders over ₹999.",
          },
          {
            id: "2",
            question: "Can I return a product?",
            answer: "Yes, we accept returns within 14 days of delivery. The item must be unused, in its original packaging, and with all tags intact.",
          },
          {
            id: "3",
            question: "How do I track my order status?",
            answer: "Go to your Orders page by tapping the Orders tile in your Account, or by navigating to /orders. There, you can view the status of each order: Placed, Shipped, or Delivered.",
          },
          {
            id: "4",
            question: "Who is the seller on Kura?",
            answer: "Kura is a single-seller boutique, meaning all products are directly handpicked, verified, and shipped by me (the store owner). This guarantees consistent quality and support.",
          }
        ]
      };
    } catch (error) {
      return {
        badge: "Welcome to Kura",
        headline: "Curated Drops Daily.",
        subheading: "Hand-picked viral gadgets, premium streetwear, and everyday essentials chosen for quality and design.",
        trust_indicators: ["Verified Quality", "Fast Shipping", "Easy Returns"],
        announcement_bar: "Free shipping on orders above ₹999",
        store_name: "Kura",
        store_description: "Hand-picked viral gadgets, premium streetwear, and everyday essentials.",
        store_logo_url: "",
        contact_email: "support@kura.com",
        contact_phone: "+91 98765 43210",
        delivery_policy: "Free shipping on orders above ₹999",
        return_policy: "14-day return and replacement policy.",
        faq_items: [
          {
            id: "1",
            question: "How long does shipping take?",
            answer: "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping is automatically applied to orders over ₹999.",
          },
          {
            id: "2",
            question: "Can I return a product?",
            answer: "Yes, we accept returns within 14 days of delivery. The item must be unused, in its original packaging, and with all tags intact.",
          },
          {
            id: "3",
            question: "How do I track my order status?",
            answer: "Go to your Orders page by tapping the Orders tile in your Account, or by navigating to /orders. There, you can view the status of each order: Placed, Shipped, or Delivered.",
          },
          {
            id: "4",
            question: "Who is the seller on Kura?",
            answer: "Kura is a single-seller boutique, meaning all products are directly handpicked, verified, and shipped by me (the store owner). This guarantees consistent quality and support.",
          }
        ]
      };
    }
  })

export const updateHomepageConfig = createServerFn({ method: 'POST' })
  .validator(z.object({
    badge: z.string(),
    headline: z.string(),
    subheading: z.string(),
    trust_indicators: z.array(z.string()),
    announcement_bar: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      const client = getSupabaseClient();
      const hero = { badge: data.badge, headline: data.headline, subheading: data.subheading };
      
      console.log("Saving homepage_hero settings to Supabase...", hero);
      const res1 = await client
        .from('site_settings')
        .upsert({ key: 'homepage_hero', value: hero }, { onConflict: 'key' })
        .select();
      console.log("Supabase upsert 'homepage_hero' response:", res1.data, res1.error);
      if (res1.error) throw res1.error;

      console.log("Saving trust_indicators to Supabase...", data.trust_indicators);
      const res2 = await client
        .from('site_settings')
        .upsert({ key: 'trust_indicators', value: data.trust_indicators }, { onConflict: 'key' })
        .select();
      console.log("Supabase upsert 'trust_indicators' response:", res2.data, res2.error);
      if (res2.error) throw res2.error;

      console.log("Saving announcement_bar to Supabase...", data.announcement_bar);
      const res3 = await client
        .from('site_settings')
        .upsert({ key: 'announcement_bar', value: data.announcement_bar }, { onConflict: 'key' })
        .select();
      console.log("Supabase upsert 'announcement_bar' response:", res3.data, res3.error);
      if (res3.error) throw res3.error;

    } catch (e: any) {
      console.error("Failed to save to Supabase site_settings table:", e);
      throw new Error(e.message || "Failed to save settings to Supabase");
    }

    try {
      const fs = await import('fs');
      const { join } = await import('path');
      const CONFIG_PATH = join(process.cwd(), 'src/homepage-config.json');
      // Fetch full config, merge the updated fields, and write locally
      const fullConfig = await getHomepageConfig();
      const mergedConfig = {
        ...fullConfig,
        badge: data.badge,
        headline: data.headline,
        subheading: data.subheading,
        trust_indicators: data.trust_indicators,
        announcement_bar: data.announcement_bar,
      };
      await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(mergedConfig, null, 2), 'utf-8')
    } catch (error: any) {
      console.error("Failed to write homepage config locally:", error)
    }

    return { success: true }
  })

export const updateSiteSettings = createServerFn({ method: 'POST' })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator(siteSettingsSchema)
  .handler(async ({ data, context }) => {
    try {
      const client = getSupabaseClient();
      
      // Check if user is admin
      let isAdmin = context.userId === 'ccb49306-3002-4b34-b3fd-260394ca46bb';
      
      if (!isAdmin) {
        const { data: roleData, error: roleError } = await client
          .from('user_roles')
          .select('role')
          .eq('user_id', context.userId)
          .eq('role', 'admin')
          .maybeSingle();
        if (roleData && !roleError) {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        console.warn(`[AUDIT] Access Denied: User ${context.userId} attempted to edit site settings without admin role.`);
        throw new Error("Forbidden: You do not have permission to edit site settings.");
      }

      console.log(`[AUDIT] Admin Action: User ${context.userId} is bulk-updating site settings.`);
      const hero = { badge: data.badge, headline: data.headline, subheading: data.subheading };

      console.log("Bulk updating site settings in Supabase...");
      const updates = [
        client.from('site_settings').upsert({ key: 'homepage_hero', value: hero }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'trust_indicators', value: data.trust_indicators }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'announcement_bar', value: data.announcement_bar }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'store_name', value: data.store_name }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'store_description', value: data.store_description }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'store_logo_url', value: data.store_logo_url }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'contact_email', value: data.contact_email }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'contact_phone', value: data.contact_phone }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'delivery_policy', value: data.delivery_policy }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'return_policy', value: data.return_policy }, { onConflict: 'key' }).select(),
        client.from('site_settings').upsert({ key: 'faq_items', value: data.faq_items }, { onConflict: 'key' }).select(),
      ];

      const results = await Promise.all(updates);
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        console.log(`Supabase setting update [index ${i}] result:`, res.data, res.error);
        if (res.error) throw res.error;
      }

    } catch (e: any) {
      console.error("Failed to update site settings in Supabase:", e);
      throw new Error(e.message || "Failed to update site settings in Supabase");
    }

    try {
      const fs = await import('fs');
      const { join } = await import('path');
      const CONFIG_PATH = join(process.cwd(), 'src/homepage-config.json');
      await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error: any) {
      console.error("Failed to write site settings backup locally:", error)
    }

    return { success: true }
  })

export const testFetchSiteSettings = createServerFn({ method: 'POST' })
  .handler(async () => {
    console.log("[testFetchSiteSettings] server function invoked");
    try {
      const client = getSupabaseClient();
      console.log("[testFetchSiteSettings] Querying site_settings table...");
      const { data, error } = await client
        .from('site_settings')
        .select('*');
      console.log("[testFetchSiteSettings] Query result. Data count:", data ? data.length : 'null', "Error:", error);
      return { success: !error, count: data?.length, error, data };
    } catch (e: any) {
      console.error("[testFetchSiteSettings] Unexpected error:", e);
      return { success: false, error: e.message || String(e) };
    }
  });

