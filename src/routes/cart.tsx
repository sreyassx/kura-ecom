import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { useCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [{ title: 'Shopping Cart — Kura' }] }),
  component: CartPage,
})

function CartPage() {
  const { items, subtotalCents, remove, setQty } = useCart()
  const navigate = useNavigate()

  const shippingCents = 0 // Free shipping
  const totalCents = subtotalCents + shippingCents

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-ink-muted/50 mb-6">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Your cart is empty</h2>
          <p className="mt-2 text-sm text-ink-muted max-w-sm mx-auto">
            Looks like you haven't added any products to your bag yet. Let's find some drops!
          </p>
          <div className="mt-8">
            <Link to="/products">
              <Button className="rounded-full px-8">Shop All Drops</Button>
            </Link>
          </div>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl mb-8">
          Your Shopping Bag
        </h1>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm divide-y divide-border/40">
              {items.map((item) => {
                const itemSubtotal = item.priceCents * item.quantity
                return (
                  <div 
                    key={`${item.productId}-${item.size || ''}-${item.variant?.value || ''}`} 
                    className="flex flex-col sm:flex-row gap-4 py-5 first:pt-0 last:pb-0 items-start sm:items-center"
                  >
                    {/* Product Image */}
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="h-20 w-20 rounded-xl object-cover border border-border bg-surface shrink-0" 
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-muted animate-pulse shrink-0" />
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
                      <p className="text-xs text-ink-muted mt-1">
                        Price: {formatPrice(item.priceCents)}
                      </p>
                      
                      {/* Meta/Variant details */}
                      {(item.size || item.variant) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.size && (
                            <span className="inline-block px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground uppercase">
                              Size: {item.size}
                            </span>
                          )}
                          {item.variant && (
                            <span className="inline-block px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground uppercase">
                              {item.variant.name}: {item.variant.value}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions and Pricing */}
                    <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-border rounded-full p-1 bg-muted/30">
                        <button 
                          onClick={() => setQty(item.productId, item.quantity - 1, item.size, item.variant?.value)}
                          className="h-6 w-6 rounded-full hover:bg-card flex items-center justify-center transition active:scale-90 text-ink-muted hover:text-foreground"
                          aria-label="Decrease Quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                        <button 
                          onClick={() => setQty(item.productId, item.quantity + 1, item.size, item.variant?.value)}
                          className="h-6 w-6 rounded-full hover:bg-card flex items-center justify-center transition active:scale-90 text-ink-muted hover:text-foreground"
                          aria-label="Increase Quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Item Subtotal & Trash */}
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm min-w-[70px] text-right">
                          {formatPrice(itemSubtotal)}
                        </span>
                        
                        <button 
                          onClick={() => remove(item.productId, item.size, item.variant?.value)}
                          className="text-ink-muted hover:text-red-500 transition active:scale-90 p-1.5 hover:bg-red-50 rounded-full"
                          aria-label="Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Order Summary Column */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted pb-3 border-b border-border/30">
                Order Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subtotal</span>
                  <span className="font-medium text-foreground">{formatPrice(subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Shipping</span>
                  <span className="font-medium text-emerald-600">Free</span>
                </div>
                
                <div className="flex justify-between text-base font-black pt-4 border-t border-border/40 text-foreground">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(totalCents)}</span>
                </div>
              </div>

              {/* Checkout actions */}
              <div className="space-y-3 pt-2">
                <Link to="/checkout" className="block w-full">
                  <Button className="w-full rounded-full gap-1.5" size="lg">
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/products" className="block w-full">
                  <Button variant="ghost" className="w-full rounded-full text-xs text-ink-muted hover:text-foreground" size="sm">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  )
}
