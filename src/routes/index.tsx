import { createFileRoute, Link } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { Hero3D } from '@/components/Hero3D'
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ArrowRight, Flame, Sparkles, Shirt, Gem } from 'lucide-react'
import { getHomepageConfig } from '@/lib/homepage'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case 'trending-now':
      return <Flame className="h-5 w-5 text-amber-500 fill-amber-500" />;
    case 'streetwear':
      return <Shirt className="h-5 w-5 text-indigo-500" />;
    case 'everyday-finds':
      return <Gem className="h-5 w-5 text-emerald-500" />;
    default:
      return <Sparkles className="h-5 w-5 text-primary" />;
  }
}

const getCategoryShortcutIcon = (slug: string) => {
  switch (slug) {
    case 'trending-now':
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 group-hover:scale-110 transition">
          <Flame className="h-6 w-6" />
        </div>
      );
    case 'streetwear':
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition">
          <Shirt className="h-6 w-6" />
        </div>
      );
    case 'everyday-finds':
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition">
          <Gem className="h-6 w-6" />
        </div>
      );
    default:
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition">
          <Sparkles className="h-6 w-6" />
        </div>
      );
  }
}

const splitHeadline = (headline: string) => {
  const trimmed = headline.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(" ");
  if (lastSpaceIndex === -1) {
    return { before: "", last: trimmed };
  }
  return {
    before: trimmed.substring(0, lastSpaceIndex + 1),
    last: trimmed.substring(lastSpaceIndex + 1),
  };
};

function HomeComponent() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['homepage-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('active', true)
      if (error) throw error
      return data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['homepage-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data
    },
  })

  const { data: homeConfig } = useQuery({
    queryKey: ['homepage-config'],
    queryFn: () => getHomepageConfig(),
  })

  // Hero contents
  const badgeText = homeConfig?.badge || "Welcome to Kura";
  const headlineText = homeConfig?.headline || "Curated Drops Daily.";
  const subheadingText = homeConfig?.subheading || "Hand-picked viral gadgets, premium streetwear, and everyday essentials chosen for quality and design.";
  const { before, last } = splitHeadline(headlineText);

  const featuredProducts = products?.filter((p: any) => p.featured || p.categories?.slug === 'featured-drops').slice(0, 4) || []
  
  // Exclude featured-drops from the category rows if it's already shown at the top
  const displayCategories = categories?.filter((c) => c.slug !== 'featured-drops') || []

  return (
    <SiteLayout>
      <div className="space-y-16 pb-24">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pt-20 pb-12 sm:pt-32 sm:pb-20">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(110,138,87,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(110,138,87,0.06)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none" />

          {/* Glassmorphic/Mesh Blur shapes */}
          <div className="absolute top-[-10%] left-[-10%] w-[45%] aspect-square rounded-full bg-sage-400/10 blur-[130px] pointer-events-none" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] aspect-square rounded-full bg-sage-600/10 blur-[110px] pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
            {/* Centered Animated Logo */}
            <div className="flex flex-col items-center justify-center mb-12 sm:mb-16">
              {homeConfig?.store_logo_url ? (
                <img 
                   src={homeConfig.store_logo_url} 
                   alt={homeConfig.store_name || "Kura"} 
                   className="h-20 w-auto object-contain select-none pointer-events-none" 
                />
              ) : (
                <span 
                  className="relative inline-block bg-gradient-to-r from-[#A3B18A] via-[#87A96B] to-[#4A5D3A] bg-clip-text text-transparent font-display text-7xl sm:text-9xl font-black tracking-wide select-none logo-glitch"
                  data-text={homeConfig?.store_name || "Kura"}
                >
                  {homeConfig?.store_name || "Kura"}
                </span>
              )}
            </div>

            {/* Main heading, pill/badge, subheading, and trust signals have been removed/commented out to simplify the hero */}

            {/* Browse All Drops button has been removed */}
          </div>
          <Hero3D products={products} isLoading={isLoading} />
        </div>

        {/* Category Shortcuts Carousel */}
        {displayCategories.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth">
              {displayCategories.map((c) => {
                const isSelected = false; // default for home page listings
                return (
                  <Link
                    key={c.id}
                    to="/products"
                    search={{ category: c.slug }}
                    className={`shrink-0 w-[130px] h-[100px] snap-start group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-primary/5 active:scale-[0.98] ${
                      isSelected 
                        ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/30' 
                        : 'border-border bg-card hover:border-primary/40 hover:bg-primary/[0.01]'
                    }`}
                  >
                    {getCategoryShortcutIcon(c.slug)}
                    <span className="mt-3 text-xs font-bold text-foreground sm:text-sm truncate w-full px-1">{c.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured Products */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Featured Drops
              </h2>
              <p className="text-xs text-ink-muted mt-1">Highlighted selections hand-picked by the owner.</p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 group">
              See all <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
          {isLoading ? (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:gap-x-8">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:gap-x-8">
              {featuredProducts.map((product: any) => (
                <ProductCard key={product.id} p={product} />
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Category Rows */}
        {displayCategories.map((c) => {
          const categoryProducts = products?.filter((p: any) => p.category_id === c.id).slice(0, 4) || [];
          if (categoryProducts.length === 0 && isLoading) return null; // hide or show skeletons
          
          return (
            <div key={c.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {getCategoryIcon(c.slug)} {c.name}
                  </h2>
                  <p className="text-xs text-ink-muted mt-1">
                    {c.description || `Curated selections from our ${c.name} collection.`}
                  </p>
                </div>
                <Link to="/products" search={{ category: c.slug }} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 group">
                  View Category <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </Link>
              </div>
              {isLoading ? (
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:gap-x-8">
                  {[...Array(4)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : categoryProducts.length === 0 ? (
                <p className="mt-6 text-sm text-ink-muted italic">No drops available in this category yet.</p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:gap-x-8">
                  {categoryProducts.map((product: any) => (
                    <ProductCard key={product.id} p={product} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SiteLayout>
  )
}
