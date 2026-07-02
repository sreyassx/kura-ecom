import type { ReactNode } from "react";
import { Header, MobileBottomNav } from "./Header";
import { Link } from "@tanstack/react-router";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>

      <footer className="hidden border-t border-border bg-surface py-10 sm:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-ink-muted">
          <p>© {new Date().getFullYear()} Kura — curated drops, daily.</p>
          <div className="flex gap-4">
            <Link to="/products">Shop</Link>
            <Link to="/account">Account</Link>
            <Link to="/auth">Sign in</Link>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
    </div>
  );
}
