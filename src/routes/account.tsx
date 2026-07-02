import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Package, LogOut, MapPin, HelpCircle, ArrowRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — Kura" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Fetch counts to make the dashboard tiles live and informative
  const { data: orders } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  if (!user) return null;

  const ordersCount = orders?.length ?? 0;
  const wishlistCount = wishlist?.length ?? 0;
  const addressesCount = user.user_metadata?.addresses?.length ?? 0;

  const tiles = [
    {
      title: "Orders",
      description: "Track, view history, or buy again",
      info: ordersCount === 0 ? "No orders yet" : `${ordersCount} order${ordersCount !== 1 ? "s" : ""} placed`,
      href: "/orders",
      icon: Package,
      iconColor: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Wishlist",
      description: "See items you've saved",
      info: wishlistCount === 0 ? "Empty" : `${wishlistCount} item${wishlistCount !== 1 ? "s" : ""} saved`,
      href: "/wishlist",
      icon: Heart,
      iconColor: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
    {
      title: "Saved Addresses",
      description: "Manage your delivery locations",
      info: addressesCount === 0 ? "No addresses" : `${addressesCount} address${addressesCount !== 1 ? "es" : ""} saved`,
      href: "/addresses",
      icon: MapPin,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Help & Support",
      description: "FAQs, returns policy, and contact",
      info: "Help center",
      href: "/help",
      icon: HelpCircle,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        
        {/* User Header Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                Hi, {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </h1>
              <p className="text-xs text-ink-muted">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full text-xs h-9" onClick={() => signOut()}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
          </Button>
        </div>

        {/* Dashboard Grid Tiles */}
        <div className="grid gap-4 sm:grid-cols-2">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.title}
                to={tile.href}
                className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl ${tile.bgColor} p-2.5 ${tile.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-muted/45 group-hover:text-primary group-hover:translate-x-1 transition duration-300" />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground mt-4 group-hover:text-primary transition duration-300">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    {tile.description}
                  </p>
                </div>
                <div className="mt-6 border-t border-border/40 pt-3 text-[10px] font-semibold text-ink-muted tracking-wider uppercase">
                  {tile.info}
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </SiteLayout>
  );
}
