import { createFileRoute, Link } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { CheckCircle2, ShoppingBag, Truck, Calendar, MapPin, CreditCard, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const searchSchema = z.object({
  orderId: z.string().uuid(),
})

export const Route = createFileRoute('/order-confirmation')({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Order Confirmed — Kura" }] }),
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useSearch()

  // Shim WebSocket
  if (typeof globalThis !== 'undefined' && !(globalThis as any).WebSocket) {
    (globalThis as any).WebSocket = class {};
  }

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-confirmation', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-ink-muted">Loading your order confirmation details...</p>
        </div>
      </SiteLayout>
    )
  }

  if (error || !order) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <span className="text-xl">!</span>
          </div>
          <h2 className="font-display text-2xl font-bold">Order Not Found</h2>
          <p className="mt-2 text-ink-muted">We couldn't retrieve the details for order ID: {orderId}</p>
          <div className="mt-6">
            <Link to="/">
              <Button className="rounded-full">Go Back Home</Button>
            </Link>
          </div>
        </div>
      </SiteLayout>
    )
  }

  // Parse items from JSONB
  const orderItems = Array.isArray(order.items) ? order.items : [];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Success Header Box */}
        <div className="text-center pb-10 border-b border-border/40">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm shadow-emerald-100/50 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Order Confirmed!
          </h1>
          <p className="mt-3 text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
            Thank you for shopping with Kura. Your order has been successfully created under <strong>sandbox payment_pending</strong> status.
          </p>
          <div className="mt-6 inline-block bg-muted/60 backdrop-blur-[2px] border border-border px-4 py-2 rounded-full text-xs font-mono text-foreground shadow-inner select-all">
            Order ID: {order.id}
          </div>
        </div>

        {/* Content Details Grid */}
        <div className="mt-10 space-y-8">
          
          {/* Section 1: Order Summary */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
              <ShoppingBag className="h-5 w-5 text-primary" /> Ordered Items
            </h3>
            <div className="divide-y divide-border/40">
              {orderItems.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt="" 
                      className="h-16 w-16 rounded-xl object-cover border border-border bg-surface shrink-0" 
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted animate-pulse shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-ink-muted mt-1 space-x-2">
                      <span>Qty: {item.quantity}</span>
                      <span>·</span>
                      <span>{formatPrice(item.priceCents || item.price || 0)} each</span>
                      {item.size && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-foreground uppercase">Size: {item.size}</span>
                        </>
                      )}
                      {item.variant && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-foreground uppercase">Variant: {item.variant.value}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="font-black text-sm text-foreground">
                    {formatPrice((item.priceCents || item.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-5 border-t border-border/40 space-y-2 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Shipping</span>
                <span>{order.shipping_cents === 0 ? 'Free' : formatPrice(order.shipping_cents)}</span>
              </div>
              <div className="flex justify-between text-base font-black pt-3 border-t border-border/40 text-foreground">
                <span>Total Amount</span>
                <span className="text-primary">{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Shipping details */}
          <div className="grid gap-6 sm:grid-cols-2">
            
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
                <MapPin className="h-5 w-5 text-primary" /> Delivery Address
              </h3>
              <div className="text-sm text-ink-muted space-y-1">
                <p className="font-bold text-foreground">{order.full_name}</p>
                <p>{order.address_line1}</p>
                {order.address_line2 && <p>{order.address_line2}</p>}
                <p>{order.city} - {order.postal_code}</p>
                <p>{order.country}</p>
                {order.phone && <p className="pt-2 text-xs">Phone: {order.phone}</p>}
                {order.email && <p className="text-xs">Email: {order.email}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
                <CreditCard className="h-5 w-5 text-primary" /> Payment Status
              </h3>
              <div className="text-sm text-ink-muted space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-bold text-amber-600 capitalize">{order.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Your payment has been simulated successfully. The order has been marked as <strong>{order.status}</strong>. In production, this status updates once Razorpay webhook verifies successful transaction.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Placed on {new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Continue Shopping Button */}
          <div className="text-center pt-4">
            <Link to="/products">
              <Button size="lg" className="rounded-full px-10 shadow-lg shadow-primary/25 hover:scale-105 transition duration-200">
                Continue Shopping <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>

        </div>

      </div>
    </SiteLayout>
  )
}
