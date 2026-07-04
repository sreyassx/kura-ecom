import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/format";

interface Hero3DProps {
  products?: any[];
  isLoading?: boolean;
}

export function Hero3D({ products, isLoading }: Hero3DProps) {
  // Curated fallback items with premium aesthetics if DB is empty/loading
  const defaultItems = [
    {
      id: "fallback-headphones",
      name: "Studio Noise-Cancelling Headphones",
      slug: "sample-product-3", // links to sample product if it exists
      price_cents: 59900,
      image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      category: "Aesthetic Tech"
    },
    {
      id: "fallback-tee",
      name: "Premium Boxy Tee",
      slug: "sample-product-1",
      price_cents: 29900,
      image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
      category: "Streetwear"
    },
    {
      id: "fallback-watch",
      name: "Sleek Minimalist Smartwatch",
      slug: "sample-product-4",
      price_cents: 289900,
      image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      category: "Gadgets"
    }
  ];

  // Try to use real products from the database, falling back if not enough are active
  const itemsToShow = products && products.length >= 3 
    ? products.slice(0, 3).map((p, idx) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price_cents: p.price_cents,
        image_url: p.image_url || defaultItems[idx].image_url,
        category: p.categories?.name || "Curated Drop"
      }))
    : defaultItems;

  if (isLoading) {
    return (
      <div className="relative mx-auto mt-12 flex h-[350px] max-w-4xl items-center justify-center gap-6 px-4 sm:h-[450px]">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className="h-64 w-48 animate-pulse rounded-2xl bg-muted shadow-lg sm:h-80 sm:w-60"
            style={{ 
              transform: `rotate(${(i - 1) * 6}deg) translateY(${i === 1 ? -20 : 10}px)` 
            }}
          />
        ))}
      </div>
    );
  }

  // Position, rotation and z-index config for the 3 collage cards
  const cardsConfig = [
    {
      rotate: -6,
      yOffset: 20,
      scale: 0.9,
      zIndex: 10,
      hoverRotate: -2,
    },
    {
      rotate: 2,
      yOffset: -15,
      scale: 1.05,
      zIndex: 30,
      hoverRotate: 0,
    },
    {
      rotate: 6,
      yOffset: 30,
      scale: 0.95,
      zIndex: 20,
      hoverRotate: 3,
    }
  ];

  return (
    <div className="relative mx-auto mt-8 flex min-h-[380px] max-w-5xl items-center justify-center px-4 py-8 sm:min-h-[480px]">
      {/* Decorative premium radial mesh glows behind collage */}
      <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[90px] pointer-events-none" />
      <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-sage-600/10 blur-[90px] pointer-events-none" />

      {/* Collage Container */}
      <div className="relative flex w-full max-w-3xl items-center justify-center gap-3 sm:gap-6 md:gap-8">
        {itemsToShow.map((item, index) => {
          const config = cardsConfig[index];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 50, rotate: config.rotate }}
              animate={{ 
                opacity: 1, 
                y: config.yOffset, 
                rotate: config.rotate 
              }}
              whileHover={{ 
                y: config.yOffset - 25,
                scale: config.scale * 1.04,
                rotate: config.hoverRotate,
                zIndex: 40,
                transition: { duration: 0.25, ease: "easeOut" }
              }}
              transition={{ 
                duration: 0.7, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 90,
                damping: 15
              }}
              className="relative aspect-[3/4] w-[30%] min-w-[100px] max-w-[220px] cursor-pointer rounded-2xl border border-border/80 bg-card p-1.5 shadow-xl shadow-black/5 backdrop-blur-md transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/15"
              style={{ zIndex: config.zIndex }}
            >
              <Link to="/products/$slug" params={{ slug: item.slug }} className="block h-full w-full overflow-hidden rounded-xl relative group">
                {/* Product Image */}
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Glassmorphic hover overlay detail */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-left">
                  <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-primary">{item.category}</span>
                  <h3 className="text-xs sm:text-sm font-semibold text-white mt-1 truncate">{item.name}</h3>
                  <p className="text-[10px] sm:text-xs text-white/90 font-medium mt-0.5">{formatPrice(item.price_cents)}</p>
                </div>

                {/* Permanent subtle label for touch screens */}
                <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/75 backdrop-blur-[4px] px-2 py-1 flex items-center justify-between text-[9px] sm:text-[10px] text-white opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <span className="truncate max-w-[60%] font-medium">{item.name}</span>
                  <span className="font-bold text-primary-foreground bg-primary px-1 rounded">{formatPrice(item.price_cents)}</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
