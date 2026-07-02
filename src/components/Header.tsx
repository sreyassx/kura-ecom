import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ShoppingBag, Search, User as UserIcon, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
  
  const search = useSearch({ strict: false }) as { q?: string };
  const [q, setQ] = useState(search.q || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (lastAddedAt) setBump((b) => b + 1);
  }, [lastAddedAt]);

  useEffect(() => {
    setQ(search.q || "");
  }, [search.q]);

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
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md shadow-sm transition-all duration-300">
      <div className="mx-auto flex justify-between items-center sm:grid sm:grid-cols-[auto_1fr_auto] max-w-7xl gap-3 px-4 py-3 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShoppingBag className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Kura</span>
        </Link>

        <form onSubmit={onSearch} className="hidden min-w-0 sm:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search trending, streetwear, gadgets…"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
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
