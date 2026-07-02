import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { formatPrice } from "@/lib/format";

export type ProductCardData = {
  price_cents: number;
  id: string;
  slug: string;
  name: string;
  compare_at_cents: number | null;
  image_url: string | null;
  rating: number;
  reviews_count: number;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const discount =
    p.compare_at_cents && p.compare_at_cents > p.price_cents
      ? Math.round((1 - p.price_cents / p.compare_at_cents) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="tilt-card group rounded-2xl border border-border bg-card p-3"
    >
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-muted" />
          )}

          {discount > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              −{discount}%
            </span>
          )}
        </div>

        <div className="mt-3 px-1">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{p.name}</h3>

          <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{(p.rating ?? 0).toFixed(1)}</span>
            <span>·</span>
            <span>{p.reviews_count ?? 0} reviews</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground">
              {formatPrice(p.price_cents)}
            </span>
            {discount > 0 && (
              <span className="text-xs text-ink-muted line-through">
                {formatPrice(p.compare_at_cents!)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="aspect-square animate-pulse rounded-xl bg-muted" />
      <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
