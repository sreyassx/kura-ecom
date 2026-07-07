import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getRequest } from '@tanstack/react-start/server'

// Shim WebSocket if needed
if (typeof globalThis !== 'undefined' && !(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = class {};
}

import { supabase } from '@/integrations/supabase/client'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false }
    });
  }
  return supabase;
}

async function getOptionalUserId(): Promise<string | null> {
  const request = getRequest();
  const authHeader = request?.headers?.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        const client = createClient(url, key, { auth: { persistSession: false } });
        const { data } = await client.auth.getClaims(token);
        return data?.claims?.sub || null;
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

const orderInputSchema = z.object({
  fullName: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email format").or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().min(5, "Address is too short"),
  city: z.string().min(2, "City is too short"),
  postalCode: z.string().min(4, "Postal code is too short"),
  country: z.string(),
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    size: z.string().nullable().optional(),
    variant: z.object({
      id: z.string().optional(),
      name: z.string(),
      value: z.string(),
      sku: z.string().optional(),
      price_adjustment: z.number().optional(),
      image_url: z.string().optional(),
    }).nullable().optional()
  }))
});

export const placeOrderSecure = createServerFn({ method: 'POST' })
  .validator(orderInputSchema)
  .handler(async ({ data }) => {
    try {
      const client = getSupabaseClient();
      const userId = await getOptionalUserId();

      // Retrieve product IDs to query
      const productIds = data.items.map(item => item.id);
      if (productIds.length === 0) {
        throw new Error("Cart is empty");
      }

      // Fetch correct product prices and details fresh from DB
      const { data: dbProducts, error: dbError } = await client
        .from('products')
        .select('id, name, slug, price_cents, image_url, active, variants')
        .in('id', productIds);

      if (dbError || !dbProducts) {
        throw new Error("Failed to fetch product details for pricing verification");
      }

      // Map DB products for quick lookup
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // Verify all items are active and exist, and calculate subtotal
      let subtotalCents = 0;
      const orderItems = [];

      for (const item of data.items) {
        const dbProd = productMap.get(item.id);
        if (!dbProd) {
          throw new Error(`Product not found.`);
        }
        if (!dbProd.active) {
          throw new Error(`Product "${dbProd.name}" is no longer available.`);
        }

        // Validate variant and calculate correct price including adjustment
        let price = dbProd.price_cents;
        if (item.variant) {
          const dbVariants = Array.isArray((dbProd as any).variants) ? (dbProd as any).variants : [];
          const matchedVariant = dbVariants.find(
            (v: any) => v.name === item.variant?.name && v.value === item.variant?.value
          );
          if (matchedVariant && matchedVariant.price_adjustment) {
            price += matchedVariant.price_adjustment;
          }
        }

        subtotalCents += price * item.quantity;

        orderItems.push({
          id: dbProd.id,
          name: dbProd.name,
          slug: dbProd.slug,
          priceCents: price,
          quantity: item.quantity,
          size: item.size || null,
          imageUrl: item.variant?.image_url || dbProd.image_url || null,
          variant: item.variant || null,
        });
      }

      // Calculate shipping using the original threshold calculation
      const shippingCents = subtotalCents > 5000 ? 0 : 490;
      const totalCents = subtotalCents + shippingCents;

      // Construct safe server-validated payload
      const orderPayload = {
        user_id: userId,
        full_name: data.fullName,
        email: data.email || "",
        phone: data.phone || null,
        address_line1: data.address,
        address_line2: null,
        city: data.city,
        postal_code: data.postalCode,
        country: data.country,
        items: orderItems,
        subtotal_cents: subtotalCents,
        shipping_cents: shippingCents,
        total_cents: totalCents,
        status: 'payment_pending',
      };

      console.log("Inserting secure server-calculated order into Supabase...", {
        subtotal_cents: subtotalCents,
        shipping_cents: shippingCents,
        total_cents: totalCents
      });

      const { data: newOrder, error: insertError } = await client
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single();

      if (insertError) {
        console.error("Order insertion failed:", insertError);
        throw new Error("Failed to place your order. Please try again.");
      }

      console.log("✅ [Order Placement] Fixed: Calculated order totals server-side and placed order successfully:", newOrder.id);
      return { success: true, orderId: newOrder.id };

    } catch (err: any) {
      console.error("placeOrderSecure failed:", err.message || err);
      return { success: false, error: err.message || "Checkout failed" };
    }
  });
