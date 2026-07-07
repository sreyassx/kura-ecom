import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { formatPrice } from '@/lib/format'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { placeOrderSecure } from '@/lib/orders'
import { ShoppingBag, ArrowLeft, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/checkout')({
  head: () => ({ meta: [{ title: 'Checkout — Kura' }] }),
  component: CheckoutPage,
})

function CheckoutPage() {
  const { items, subtotalCents, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  // Shipping details state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('India')

  // Prefill details if user changes/loads
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata
      const addr = meta?.shipping_address
      if (meta?.full_name && !fullName) setFullName(meta.full_name)
      if (user.email && !email) setEmail(user.email)
      if (addr) {
        if (addr.fullName) setFullName(addr.fullName)
        if (addr.email) setEmail(addr.email)
        if (addr.phone) setPhone(addr.phone)
        if (addr.address) setAddress(addr.address)
        if (addr.city) setCity(addr.city)
        if (addr.postalCode) setPostalCode(addr.postalCode)
        if (addr.country) setCountry(addr.country)
      }
    }
  }, [user])

  const shippingCents = 0 // Free shipping
  const totalCents = subtotalCents + shippingCents

  const checkout = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('Cart is empty')
      if (!fullName || !address || !city || !postalCode) {
        throw new Error('Please fill in all required delivery fields.')
      }

      setBusy(true)

      const checkoutItems = items.map(item => ({
        id: item.productId,
        quantity: item.quantity,
        size: item.size || null,
        variant: item.variant || null,
      }))

      const res = await placeOrderSecure({
        data: {
          fullName,
          email,
          phone: phone || null,
          address,
          city,
          postalCode,
          country,
          items: checkoutItems,
        }
      })

      if (!res?.success) {
        throw new Error(res?.error || 'Failed to place order.')
      }

      // Save address back to user_metadata in Supabase if logged in
      if (user) {
        const savedAddress = {
          fullName,
          email,
          phone,
          address,
          city,
          postalCode,
          country,
        }
        const existingAddresses = user.user_metadata?.addresses || []
        const updatedAddresses = [
          savedAddress,
          ...existingAddresses.filter(
            (addr: any) => addr.address !== address || addr.city !== city
          ),
        ].slice(0, 5)

        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            shipping_address: savedAddress,
            addresses: updatedAddresses,
          },
        })
      }

      return res
    },
    onSuccess: (data: any) => {
      toast.success('Order placed successfully!')
      clear() // Clear cart store
      navigate({
        to: '/order-confirmation',
        search: { orderId: data.orderId }
      })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Checkout failed')
    },
    onSettled: () => {
      setBusy(false)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkout.mutate()
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-ink-muted/50" />
          <h2 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h2>
          <p className="mt-2 text-ink-muted">Add products to your cart before proceeding to checkout.</p>
          <div className="mt-6">
            <Link to="/products">
              <Button className="rounded-full">Shop products</Button>
            </Link>
          </div>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Navigation back link */}
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Bag
          </Link>
        </div>

        <h1 className="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl mb-8">
          Checkout
        </h1>

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Left Column: Delivery Address Form */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-foreground mb-6">
                Delivery Address
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Full Name *</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Email *</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Phone Number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Street Address *</span>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Flat No, Building, Street Name"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">City / District *</span>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Postal Code *</span>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="400001"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Country *</span>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="hidden sm:block pt-4">
                  <Button type="submit" disabled={busy} className="w-full rounded-full" size="lg">
                    {busy ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Order Summary Review */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Order items list */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted pb-3 border-b border-border/30 mb-4">
                Order Review
              </h2>
              
              <div className="divide-y divide-border/40">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size || ''}-${item.variant?.value || ''}`} className="flex gap-3 py-3 first:pt-0 last:pb-0 items-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover border border-border bg-surface shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted animate-pulse shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-ink-muted mt-0.5">
                        {item.quantity} × {formatPrice(item.priceCents)}
                        {item.size && <span className="font-semibold text-foreground uppercase ml-1">· Size: {item.size}</span>}
                      </p>
                    </div>
                    <span className="font-bold text-xs text-foreground shrink-0">{formatPrice(item.priceCents * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown and place order button */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted pb-3 border-b border-border/30">
                Billing Details
              </h2>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-ink-muted">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotalCents)}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Shipping</span>
                  <span className="text-emerald-600">Free</span>
                </div>
                
                <div className="flex justify-between text-base font-black pt-3 border-t border-border/40 text-foreground">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatPrice(totalCents)}</span>
                </div>
              </div>

              {/* Secure sandbox alert box */}
              <div className="rounded-xl bg-sage-50/50 p-4 border border-sage-200/50 text-[11px] text-primary flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block text-emerald-800">Secure Checkout</span>
                  This checkout is running in mock sandbox payment mode. The order will be immediately recorded as <code className="bg-sage-100 px-1 rounded">payment_pending</code>.
                </div>
              </div>

              <div className="block sm:hidden pt-2">
                <Button onClick={handleSubmit} disabled={busy} className="w-full rounded-full" size="lg">
                  {busy ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </SiteLayout>
  )
}
