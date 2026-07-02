import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ShoppingBag, Search, User as UserIcon, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { getHomepageConfig } from "@/lib/homepage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { count, lastAddedAt } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [bump, setBump] = useState(0);
  
  const { data: homeConfig } = useQuery({
    queryKey: ['homepage-config'],
    queryFn: () => getHomepageConfig(),
  });
  
  const search = useSearch({ strict: false }) as { q?: string };
  const [q, setQ] = useState(search.q || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (lastAddedAt) setBump((b) => b + 1);
  }, [lastAddedAt]);

  useEffect(() => {
    setQ(search.q || "");
  }, [search.q]);

  // Live suggestions query with debounce
  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, price_cents, image_url")
          .ilike("name", `%${q}%`)
          .eq("active", true)
          .limit(5);
        setSuggestions(data || []);
      } catch (err) {
        console.error(err);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [q]);

  const handleSearchChange = (value: string) => {
    setQ(value);
    navigate({
      to: "/products",
      search: (prev: any) => ({ ...prev, q: value || undefined }),
      replace: true,
    });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md shadow-sm transition-all duration-300">
      {/* Announcement Bar */}
      <div className="relative flex overflow-x-hidden bg-primary text-primary-foreground py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase select-none">
        <div className="animate-marquee whitespace-nowrap flex shrink-0 items-center gap-16 pr-16">
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
          <span>🎉 {homeConfig?.announcement_bar || "Free shipping on orders above ₹999"}</span>
        </div>
      </div>

      <div className="mx-auto flex justify-between items-center sm:grid sm:grid-cols-[auto_1fr_auto] max-w-7xl gap-3 px-4 py-3 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          {homeConfig?.store_logo_url ? (
            <img 
              src={homeConfig.store_logo_url} 
              alt={homeConfig.store_name || "Kura"} 
              className="h-8 w-auto object-contain" 
            />
          ) : (
            <>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">{homeConfig?.store_name || "Kura"}</span>
            </>
          )}
        </Link>

        <form onSubmit={onSearch} className="hidden min-w-0 sm:block relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search trending, streetwear, gadgets…"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && q.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-card p-2 shadow-lg z-50 max-h-80 overflow-y-auto">
              {suggestions.length === 0 ? (
                <div className="p-3 text-xs text-ink-muted text-center">
                  No matching drops found.
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted px-3 py-1">
                    Matching Drops
                  </p>
                  {suggestions.map((item) => (
                    <Link
                      key={item.id}
                      to="/products/$slug"
                      params={{ slug: item.slug }}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition text-left"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} className="h-8 w-8 rounded-lg object-cover" alt="" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-ink-muted">{formatPrice(item.price_cents)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>


        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/products" className="hidden text-sm text-ink-muted hover:text-foreground sm:inline">
            Shop
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="hidden items-center gap-1 rounded-full border border-primary/30 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground sm:inline-flex"
            >
              <LayoutDashboard className="h-3 w-3" /> Admin
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account">
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/account">My account</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/auth">Sign in</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth" search={{ mode: "signup" } as never}>
                      Create account
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={bump}
                  exit={{ scale: 0.4, opacity: 0 }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const { count } = useCart();
  const { user } = useAuth();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2 text-xs">
        <Link
          to="/"
          className="flex flex-col items-center gap-0.5 py-1 text-ink-muted [&.active]:text-primary"
          activeProps={{ className: "active" }}
          activeOptions={{ exact: true }}
        >
          <Menu className="h-5 w-5" /> Home
        </Link>
        <Link
          to="/products"
          className="flex flex-col items-center gap-0.5 py-1 text-ink-muted [&.active]:text-primary"
          activeProps={{ className: "active" }}
        >
          <Search className="h-5 w-5" /> Shop
        </Link>
        <Link
          to="/cart"
          className="relative flex flex-col items-center gap-0.5 py-1 text-ink-muted [&.active]:text-primary"
          activeProps={{ className: "active" }}
        >
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-3 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
          Cart
        </Link>
        <Link
          to={user ? "/account" : "/auth"}
          className="flex flex-col items-center gap-0.5 py-1 text-ink-muted [&.active]:text-primary"
          activeProps={{ className: "active" }}
        >
          <UserIcon className="h-5 w-5" /> {user ? "Me" : "Sign in"}
        </Link>
      </div>
    </nav>
  );
}
