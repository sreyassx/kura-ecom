import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Calendar, ChevronDown, ChevronUp, ShoppingBag, ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — Kura" }] }),
  component: OrdersPage,
});

const STATUS_STEPS = ["placed", "shipped", "delivered"] as const;

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!user || isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-ink-muted text-sm">Loading your orders...</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/account">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Your Orders</h1>
            <p className="text-sm text-ink-muted">View and track all your purchases</p>
          </div>
        </div>

        {!orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-12 w-12 text-ink-muted/50" />
            <h2 className="mt-4 font-display text-xl font-bold">No orders found</h2>
            <p className="mt-2 text-sm text-ink-muted">You haven't placed any orders yet on Kura.</p>
            <div className="mt-6">
              <Link to="/products">
                <Button className="rounded-full">Browse Products</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const isExpanded = expandedOrderId === o.id;
              const items = o.items as any[] || [];
              const itemCount = items.reduce((acc, item) => acc + (item.quantity || 1), 0);

              return (
                <div
                  key={o.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
                >
                  {/* Order Card Header */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer select-none border-b border-border/40 bg-muted/20"
                    onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">
                          Order #{o.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <p className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(o.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-base">{formatPrice(o.total_cents)}</p>
                        <p className="text-xs text-ink-muted">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-ink-muted">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Quick Tracker on Collapsed Card */}
                  {!isExpanded && (
                    <div className="px-5 py-3 bg-card border-t border-border/10 flex items-center justify-between text-xs">
                      <span className="text-ink-muted">Status:</span>
                      <span
                        className={`font-semibold capitalize px-2 py-0.5 rounded-full ${
                          o.status === "delivered"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : o.status === "shipped"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  )}

                  {/* Expanded Order Details */}
                  {isExpanded && (
                    <div className="p-5 space-y-6 animate-fadeIn">
                      {/* Status Tracker */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                          Track Shipment
                        </h4>
                        <StatusTracker status={o.status} />
                      </div>

                      {/* Items Details */}
                      <div className="border-t border-border/40 pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                          Items Ordered
                        </h4>
                        <div className="divide-y divide-border/30">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center justify-between">
                              <div className="flex gap-3 items-center min-w-0">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-12 w-12 rounded-lg object-cover border border-border bg-surface shrink-0"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg border border-border bg-muted shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <Link
                                    to="/products/$slug"
                                    params={{ slug: item.slug }}
                                    className="font-semibold text-xs text-foreground hover:underline hover:text-primary truncate block"
                                  >
                                    {item.name}
                                  </Link>
                                  <p className="text-[10px] text-ink-muted mt-0.5">
                                    Qty: {item.quantity} · {formatPrice(item.priceCents)} each
                                    {item.size && (
                                      <span className="ml-1.5 inline-flex items-center rounded bg-muted px-1 py-0.25 text-[9px] font-bold text-foreground uppercase">
                                        Size: {item.size}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-xs shrink-0 text-foreground">
                                {formatPrice(item.priceCents * (item.quantity || 1))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping & Payment Summary */}
                      <div className="grid gap-6 border-t border-border/40 pt-4 sm:grid-cols-2">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> Shipping Address
                          </h4>
                          <div className="rounded-xl border border-border bg-muted/10 p-3.5 text-xs text-ink-muted space-y-1">
                            <p className="font-bold text-foreground">{o.full_name}</p>
                            <p>{o.address_line1}</p>
                            {o.address_line2 && <p>{o.address_line2}</p>}
                            <p>
                              {o.city} - {o.postal_code}
                            </p>
                            <p>{o.country}</p>
                            {o.phone && <p className="pt-1.5 text-[10px]">Phone: {o.phone}</p>}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                            Price Summary
                          </h4>
                          <div className="rounded-xl border border-border bg-muted/10 p-3.5 text-xs space-y-2">
                            <div className="flex justify-between text-ink-muted">
                              <span>Subtotal</span>
                              <span>{formatPrice(o.subtotal_cents)}</span>
                            </div>
                            <div className="flex justify-between text-ink-muted">
                              <span>Shipping</span>
                              <span>{o.shipping_cents === 0 ? "Free" : formatPrice(o.shipping_cents)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-sm border-t border-border/30 pt-2 text-foreground">
                              <span>Total Paid</span>
                              <span className="text-primary">{formatPrice(o.total_cents)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function StatusTracker({ status }: { status: string }) {
  const idx = Math.max(0, STATUS_STEPS.indexOf(status as any));

  return (
    <div className="flex items-center gap-2 py-2">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase transition duration-300 ${
              i <= idx ? "bg-primary text-primary-foreground scale-110 shadow-sm" : "bg-muted text-ink-muted"
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-xs capitalize ${i <= idx ? "font-semibold text-foreground" : "text-ink-muted"}`}>
            {s}
          </span>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`h-1 flex-1 rounded-full transition duration-300 ${i < idx ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
