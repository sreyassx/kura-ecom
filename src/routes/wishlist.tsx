import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "My Wishlist — Kura" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id, products(id, name, slug, price_cents, image_url, description)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const removeWishlist = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user!.id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.id] });
      toast.success("Removed from wishlist");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!user || isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-ink-muted text-sm">Loading wishlist...</p>
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
            <h1 className="font-display text-3xl font-bold tracking-tight">Your Wishlist</h1>
            <p className="text-sm text-ink-muted">Saved products you want to buy later</p>
          </div>
        </div>

        {!wishlist || wishlist.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <Heart className="mx-auto h-12 w-12 text-ink-muted/50" />
            <h2 className="mt-4 font-display text-xl font-bold">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-ink-muted">Save items while browsing to keep track of them here.</p>
            <div className="mt-6">
              <Link to="/products">
                <Button className="rounded-full">Browse Products</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {wishlist.map((w: any) => {
              const p = w.products;
              if (!p) return null;

              return (
                <div
                  key={w.product_id}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4 items-center justify-between shadow-sm hover:shadow-md transition duration-200"
                >
                  <Link
                    to="/products/$slug"
                    params={{ slug: p.slug }}
                    className="flex gap-4 flex-1 min-w-0"
                  >
                    <div className="h-20 w-20 rounded-lg overflow-hidden border border-border bg-surface shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-semibold text-sm hover:underline text-foreground truncate block">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                      <p className="text-xs font-bold text-primary mt-2">
                        {formatPrice(p.price_cents)}
                      </p>
                    </div>
                  </Link>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Link to="/products/$slug" params={{ slug: p.slug }}>
                      <Button size="sm" variant="outline" className="rounded-full text-xs">
                        View Product
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-ink-muted hover:text-destructive rounded-full self-end"
                      onClick={() => removeWishlist.mutate(p.id)}
                      disabled={removeWishlist.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
