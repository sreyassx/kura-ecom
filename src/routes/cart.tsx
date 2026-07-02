import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { formatPrice } from '@/lib/format'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { placeOrderSecure } from '@/lib/orders'


const cartSearchSchema = z.object({
  buyNow: z.string().optional(),
  qty: z.coerce.number().optional(),
  size: z.string().optional(),
})

export const Route = createFileRoute('/cart')({
  validateSearch: cartSearchSchema,
  head: () => ({ meta: [{ title: 'Shopping Cart — Kura' }] }),
  component: CartPage,
})

function CartPage() {
  const { buyNow, qty, size } = Route.useSearch()
  const buyNowQty = qty || 1
  const isBuyNow = !!buyNow

  const { items: cartItems, subtotalCents: cartSubtotalCents, remove: cartRemove, setQty: cartSetQty, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<'cart' | 'shipping' | 'summary'>(isBuyNow ? 'shipping' : 'cart')

  // Shipping details state (prefill if logged in)
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('India') // India-facing default

  // Fetch product for Buy Now path
  const { data: buyNowProduct, isLoading: loadingBuyNow } = useQuery({
    queryKey: ['buy-now-product', buyNow],
    enabled: isBuyNow,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', buyNow!)
        .maybeSingle()
      if (error) throw error
      return data
    }
  })

  const buyNowItems = buyNowProduct ? [{
    productId: buyNowProduct.id,
    slug: buyNowProduct.slug,
    name: buyNowProduct.name,
    priceCents: buyNowProduct.price_cents,
    imageUrl: buyNowProduct.image_url,
    quantity: buyNowQty,
    size: size || undefined
  }] : []

  const items = isBuyNow ? buyNowItems : cartItems
  const subtotalCents = isBuyNow
    ? (buyNowProduct ? buyNowProduct.price_cents * buyNowQty : 0)
    : cartSubtotalCents

  const remove = (productId: string, itemSize?: string) => {
    if (isBuyNow) {
      navigate({ to: '/products' })
    } else {
      cartRemove(productId, itemSize)
    }
  }

  const setQty = (productId: string, newQty: number, itemSize?: string) => {
    if (isBuyNow) {
      if (newQty <= 0) {
        navigate({ to: '/products' })
      } else {
        navigate({
          to: '/cart',
          search: { buyNow: buyNow || undefined, qty: newQty, size: size || undefined }
        })
      }
    } else {
      cartSetQty(productId, newQty, itemSize)
    }
  }

  const shippingCents = subtotalCents > 5000 ? 0 : 490 // Free shipping over ₹50
  const totalCents = subtotalCents + shippingCents

  // Prefill details when user login state loads
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.full_name && !fullName) setFullName(user.user_metadata.full_name)
      if (user.email && !email) setEmail(user.email)
      
      const savedAddress = user.user_metadata?.shipping_address
      if (savedAddress) {
        if (savedAddress.fullName && !fullName) setFullName(savedAddress.fullName)
        if (savedAddress.phone && !phone) setPhone(savedAddress.phone)
        if (savedAddress.address && !address) setAddress(savedAddress.address)
        if (savedAddress.city && !city) setCity(savedAddress.city)
        if (savedAddress.postalCode && !postalCode) setPostalCode(savedAddress.postalCode)
        if (savedAddress.country && !country) setCountry(savedAddress.country)
      }
    }
  }, [user])

  const checkout = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('Cart is empty')
      if (!fullName || !address || !city || !postalCode) {
        throw new Error('Please fill in all shipping details')
      }

      setBusy(true)

      const checkoutItems = items.map(item => ({
        id: item.productId,
        quantity: item.quantity,
        size: item.size || null,
      }));

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
      });

      if (!res?.success) {
        throw new Error('Failed to place order.');
      }

      // Save address to user_metadata if logged in
      if (user) {
        const savedAddress = {
          fullName,
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

        const { error: updateErr } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            shipping_address: savedAddress,
            addresses: updatedAddresses,
          },
        })
        if (updateErr) {
          console.error('Failed to update user address metadata:', updateErr)
        }
      }

      return res;
    },
    onSuccess: () => {
      toast.success('Order placed successfully!')
      if (!isBuyNow) {
        clear()
      }
      navigate({ to: user ? '/orders' : '/' }) // Navigate to new orders page if logged in
    },
    onError: (err: any) => {
      toast.error(err.message)
    },
    onSettled: () => {
      setBusy(false);
    },
  })

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'shipping') {
      if (!fullName || !address || !city || !postalCode) {
        toast.error('Please complete all required fields')
        return
      }
      setStep('summary')
    }
  }

  if (isBuyNow && loadingBuyNow) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-ink-muted text-sm">Preparing checkout...</p>
        </div>
      </SiteLayout>
    )
  }

  if (isBuyNow && !buyNowProduct && !loadingBuyNow) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-ink-muted/50" />
          <h2 className="mt-4 font-display text-2xl font-bold">Product not found</h2>
          <p className="mt-2 text-ink-muted">The product you are trying to buy does not exist.</p>
          <div className="mt-6">
            <Link to="/products">
              <Button className="rounded-full">Shop products</Button>
            </Link>
          </div>
        </div>
      </SiteLayout>
    )
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-ink-muted/50" />
          <h2 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h2>
          <p className="mt-2 text-ink-muted">Looks like you haven't added any products to your cart yet.</p>
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
        
        {/* Step Progress Tracker */}
        <div className="mb-10 flex justify-center items-center">
          <button 
            onClick={() => setStep('cart')}
            className={`flex items-center focus:outline-none ${step === 'cart' ? 'text-primary font-bold' : 'text-ink-muted'}`}
          >
            <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${step === 'cart' ? 'bg-primary text-white border-primary' : 'bg-card border-border'}`}>1</span>
            <span className="ml-2 text-xs hidden sm:inline">Bag</span>
          </button>
          <div className={`h-px w-10 sm:w-16 mx-3 ${step !== 'cart' ? 'bg-primary' : 'bg-border'}`} />
          
          <button 
            onClick={() => step !== 'cart' && setStep('shipping')}
            disabled={step === 'cart'}
            className={`flex items-center focus:outline-none ${step === 'shipping' ? 'text-primary font-bold' : 'text-ink-muted'}`}
          >
            <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${step === 'shipping' ? 'bg-primary text-white border-primary' : step === 'summary' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-card border-border'}`}>2</span>
            <span className="ml-2 text-xs hidden sm:inline font-semibold">Shipping</span>
          </button>
          <div className={`h-px w-10 sm:w-16 mx-3 ${step === 'summary' ? 'bg-primary' : 'bg-border'}`} />
          
          <div className={`flex items-center ${step === 'summary' ? 'text-primary font-bold' : 'text-ink-muted'}`}>
            <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${step === 'summary' ? 'bg-primary text-white border-primary' : 'bg-card border-border'}`}>3</span>
            <span className="ml-2 text-xs hidden sm:inline font-semibold">Payment</span>
          </div>
        </div>

        {/* STEP 1: CART OVERVIEW */}
        {step === 'cart' && (
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-6">
              Shopping Bag
            </h1>
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.size || ''}`}
                    className="flex gap-4 rounded-2xl border border-border bg-card p-4 items-center"
                  >
                    <div className="h-20 w-20 rounded-lg overflow-hidden border border-border bg-surface shrink-0">
                       {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/products/$slug"
                        params={{ slug: item.slug }}
                        className="font-semibold text-sm hover:underline block truncate"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-ink-muted mt-1">
                        {formatPrice(item.priceCents)}
                        {item.size && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground uppercase">
                            Size: {item.size}
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center rounded-full border border-border px-2 py-0.5 text-xs">
                          <button
                            onClick={() => setQty(item.productId, item.quantity - 1, item.size)}
                            className="px-1.5 font-bold hover:text-primary"
                          >
                            -
                          </button>
                          <span className="px-2 font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => setQty(item.productId, item.quantity + 1, item.size)}
                            className="px-1.5 font-bold hover:text-primary"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-ink-muted hover:text-destructive rounded-full"
                      onClick={() => remove(item.productId, item.size)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted">Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Subtotal</span>
                      <span className="font-medium">{formatPrice(subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Shipping</span>
                      <span className="font-medium">{shippingCents === 0 ? 'Free' : formatPrice(shippingCents)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-border/40 pt-2 mt-2">
                      <span>Total</span>
                      <span>{formatPrice(totalCents)}</span>
                    </div>
                  </div>
                  <Button onClick={() => setStep('shipping')} className="w-full rounded-full mt-4" size="lg">
                    Checkout Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SHIPPING DETAILS */}
        {step === 'shipping' && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <h2 className="font-display text-xl font-bold mb-6 text-foreground">Shipping Details</h2>
              <form onSubmit={handleNextStep} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Full name *</span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="John Doe"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Phone number *</span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      placeholder="9876543210"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Address Line 1 *</span>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    placeholder="House No, Apartment, Street name"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">City *</span>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="address-level2"
                      placeholder="Mumbai"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Postal code *</span>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      autoComplete="postal-code"
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

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Email address (optional)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="john@example.com"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="mt-8 flex gap-3 border-t border-border/40 pt-6">
                  <Button type="button" variant="outline" onClick={() => setStep('cart')} className="flex-1 rounded-full">
                    Back to Bag
                  </Button>
                  <Button type="submit" className="flex-1 rounded-full">
                    Continue to Summary
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 3: ORDER SUMMARY & PAYMENT */}
        {step === 'summary' && (
          <div className="grid gap-8 lg:grid-cols-12">
            
            {/* Left side: Review Items & Address */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-base font-bold mb-4">Delivery Address</h3>
                <div className="text-sm text-ink-muted space-y-1">
                  <p className="font-semibold text-foreground">{fullName}</p>
                  <p>{address}</p>
                  <p>{city} - {postalCode}</p>
                  <p>{country}</p>
                  <p className="pt-2 text-xs">Phone: {phone}{email ? ` · Email: ${email}` : ''}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-base font-bold mb-4">Review Order Items</h3>
                <div className="divide-y divide-border/40">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size || ''}`} className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center">
                      <img src={item.imageUrl || ''} alt="" className="h-12 w-12 rounded-lg object-cover border border-border bg-surface shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-ink-muted">
                          {item.quantity} × {formatPrice(item.priceCents)}
                          {item.size && <span className="ml-1.5 font-semibold text-foreground uppercase">Size: {item.size}</span>}
                        </p>
                      </div>
                      <span className="font-bold text-xs">{formatPrice(item.priceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: Pricing and Place Order */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted">Payment Details</h3>
                
                <div className="space-y-2 text-sm border-b border-border/40 pb-4">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Subtotal</span>
                    <span>{formatPrice(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Shipping</span>
                    <span>{shippingCents === 0 ? 'Free' : formatPrice(shippingCents)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-border/40">
                    <span>Total Amount</span>
                    <span className="text-primary">{formatPrice(totalCents)}</span>
                  </div>
                </div>

                {/* Razorpay Integration Info Box */}
                <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100 text-xs text-primary space-y-1.5">
                  <p className="font-bold">🔒 Secure Sandbox Checkout</p>
                  <p className="leading-relaxed">This checkout is ready to be swapped with <strong>Razorpay</strong>. Placing this order will mock the payment success state and save the order in the database.</p>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => checkout.mutate()}
                    disabled={busy}
                    className="w-full rounded-full"
                    size="lg"
                  >
                    {busy ? 'Processing...' : 'Pay & Place Order'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setStep('shipping')}
                    className="w-full rounded-full text-xs text-ink-muted hover:text-foreground"
                    size="sm"
                  >
                    Go Back to Shipping
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </SiteLayout>
  )
}

