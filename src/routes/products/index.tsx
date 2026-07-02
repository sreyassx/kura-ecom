import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { z } from 'zod'
import { Filter, RotateCcw, Star, ArrowUpDown, X } from 'lucide-react'
import { useState } from 'react'

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  rating: z.coerce.number().optional(),
  sort: z.string().optional(),
})

export const Route = createFileRoute('/products/')({
  validateSearch: searchSchema,
  component: ProductsCatalog,
})

function ProductsCatalog() {
  const { q, category, minPrice, maxPrice, rating, sort } = Route.useSearch()
  const navigate = useNavigate()
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Local state for mobile filter drawer (buffers choices until applied)
  const [localCategory, setLocalCategory] = useState<string | undefined>(category)
  const [localMinPrice, setLocalMinPrice] = useState<number | undefined>(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState<number | undefined>(maxPrice)
  const [localRating, setLocalRating] = useState<number | undefined>(rating)

  const activeFilterCount = [
    category ? 1 : 0,
    minPrice !== undefined ? 1 : 0,
    maxPrice !== undefined ? 1 : 0,
    rating !== undefined ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const localFilterCount = [
    localCategory ? 1 : 0,
    localMinPrice !== undefined ? 1 : 0,
    localMaxPrice !== undefined ? 1 : 0,
    localRating !== undefined ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const openMobileFilters = () => {
    setLocalCategory(category)
    setLocalMinPrice(minPrice)
    setLocalMaxPrice(maxPrice)
    setLocalRating(rating)
    setIsMobileFilterOpen(true)
  }

  const handleApplyFilters = () => {
    updateSearch({
      category: localCategory,
      minPrice: localMinPrice,
      maxPrice: localMaxPrice,
      rating: localRating,
    })
    setIsMobileFilterOpen(false)
  }

  const handleClearLocalFilters = () => {
    setLocalCategory(undefined)
    setLocalMinPrice(undefined)
    setLocalMaxPrice(undefined)
    setLocalRating(undefined)
  }

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-catalog', q, category, minPrice, maxPrice, rating, sort],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories(*)')
        .eq('active', true)

      if (q) {
        query = query.ilike('name', `%${q}%`)
      }

      const { data, error } = await query
      if (error) throw error

      let filtered = data || []

      // In-memory filters for speed & reactivity
      if (category) {
        filtered = filtered.filter((p) => p.categories?.slug === category)
      }
      if (minPrice !== undefined) {
        filtered = filtered.filter((p) => p.price_cents >= minPrice * 100)
      }
      if (maxPrice !== undefined) {
        filtered = filtered.filter((p) => p.price_cents <= maxPrice * 100)
      }
      if (rating !== undefined) {
        filtered = filtered.filter((p) => (p.rating || 0) >= rating)
      }

      // Sort
      if (sort === 'price_asc') {
        filtered.sort((a, b) => a.price_cents - b.price_cents)
      } else if (sort === 'price_desc') {
        filtered.sort((a, b) => b.price_cents - a.price_cents)
      } else if (sort === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      } else if (sort === 'popularity' || !sort) {
        filtered.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
      }

      return filtered
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['filter-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order')
      if (error) throw error
      return data
    },
  })

  const updateSearch = (updates: Record<string, any>) => {
    navigate({
      to: '/products',
      search: (prev: any) => {
        const next = { ...prev, ...updates }
        // Clean undefined or empty values
        Object.keys(next).forEach((key) => {
          if (next[key] === undefined || next[key] === '') {
            delete next[key]
          }
        })
        return next;
      },
    })
  }

  const clearFilters = () => {
    navigate({
      to: '/products',
      search: () => ({ q: q || undefined }),
    })
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {q ? `Search results for "${q}"` : 'All Curated Drops'}
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              {!isLoading && products ? `${products.length} product(s) available` : 'Finding products...'}
            </p>
          </div>

          {/* Controls: Filters (Mobile) & Sort */}
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={openMobileFilters}
              className="flex items-center gap-2 lg:hidden h-10 px-4 rounded-full border border-border bg-card text-xs font-bold shadow-sm hover:bg-muted transition"
            >
              <Filter className="h-3.5 w-3.5 text-primary" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex text-xs font-bold text-ink-muted items-center gap-1 uppercase tracking-wider">
                <ArrowUpDown className="h-3 w-3" /> Sort By
              </span>
              <select
                value={sort || 'popularity'}
                onChange={(e) => updateSearch({ sort: e.target.value })}
                className="h-10 rounded-full border border-border bg-card px-4 text-xs font-semibold shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              >
                <option value="popularity">Popularity</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Drops</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Filters Sidebar (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h2 className="font-display text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <Filter className="h-4 w-4 text-primary" /> Filters
              </h2>
              {(category || minPrice || maxPrice || rating) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Category</h3>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => updateSearch({ category: undefined })}
                  className={`text-left text-sm py-1 px-2 rounded-lg transition font-medium ${
                    !category ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  All Categories
                </button>
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateSearch({ category: c.slug })}
                    className={`text-left text-sm py-1 px-2 rounded-lg transition font-medium ${
                      category === c.slug ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3 border-t border-border/40 pt-6">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Price Range</h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">₹</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice || ''}
                    onChange={(e) => updateSearch({ minPrice: e.target.value || undefined })}
                    className="h-9 w-full rounded-lg border border-border bg-card pl-6 pr-2 text-xs outline-none focus:border-primary"
                  />
                </div>
                <span className="text-ink-muted text-xs">—</span>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">₹</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice || ''}
                    onChange={(e) => updateSearch({ maxPrice: e.target.value || undefined })}
                    className="h-9 w-full rounded-lg border border-border bg-card pl-6 pr-2 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Price Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: 'Under ₹1,000', min: undefined, max: 1000 },
                  { label: '₹1,000 – ₹3,000', min: 1000, max: 3000 },
                  { label: '₹3,000+', min: 3000, max: undefined },
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => updateSearch({ minPrice: preset.min, maxPrice: preset.max })}
                    className={`text-[10px] font-semibold px-2 py-1 border rounded-full transition ${
                      minPrice === preset.min && maxPrice === preset.max
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2 border-t border-border/40 pt-6">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Minimum Rating</h3>
              <div className="flex flex-col gap-1.5">
                {[4.5, 4.0, 3.5].map((val) => (
                  <button
                    key={val}
                    onClick={() => updateSearch({ rating: val })}
                    className={`flex items-center gap-1.5 text-sm py-1 px-2 rounded-lg text-left transition font-medium ${
                      rating === val ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < Math.floor(val) ? 'fill-amber-400' : 'text-border'
                          }`}
                        />
                      ))}
                    </div>
                    <span>{val.toFixed(1)}+ Stars</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-8">
                {[...Array(6)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : !products || products.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-sm font-semibold text-foreground mb-1">No drops found</p>
                <p className="text-xs text-ink-muted mb-4">Try clearing filters or search to discover more.</p>
                <button
                  onClick={clearFilters}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/95 transition"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-8">
                {products.map((product: any) => (
                  <ProductCard key={product.id} p={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-[2rem] bg-background border-t border-border p-6 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider">Filters</h2>
                {localFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                    {localFilterCount}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {localFilterCount > 0 && (
                  <button
                    onClick={handleClearLocalFilters}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
                <button 
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="rounded-full p-1.5 hover:bg-muted transition text-ink-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Filters */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-none">
              {/* Category Filter */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Category</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                  <button
                    onClick={() => setLocalCategory(undefined)}
                    className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition ${
                      !localCategory 
                        ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories?.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setLocalCategory(c.slug)}
                      className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition ${
                        localCategory === c.slug 
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-3 border-t border-border/40 pt-6">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Price Range</h3>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">₹</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={localMinPrice || ''}
                      onChange={(e) => setLocalMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-10 w-full rounded-xl border border-border bg-card pl-6 pr-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <span className="text-ink-muted text-xs">—</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">₹</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={localMaxPrice || ''}
                      onChange={(e) => setLocalMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-10 w-full rounded-xl border border-border bg-card pl-6 pr-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Price Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: 'Under ₹1,000', min: undefined, max: 1000 },
                    { label: '₹1,000 – ₹3,000', min: 1000, max: 3000 },
                    { label: '₹3,000+', min: 3000, max: undefined },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => { setLocalMinPrice(preset.min); setLocalMaxPrice(preset.max); }}
                      className={`text-xs font-semibold px-3 py-1.5 border rounded-full transition ${
                        localMinPrice === preset.min && localMaxPrice === preset.max
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-3 border-t border-border/40 pt-6">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Minimum Rating</h3>
                <div className="flex flex-col gap-1.5">
                  {[4.5, 4.0, 3.5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setLocalRating(val)}
                      className={`flex items-center gap-1.5 text-sm py-2 px-3 rounded-xl text-left transition font-medium ${
                        localRating === val ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(val) ? 'fill-amber-400' : 'text-border'
                            }`}
                          />
                        ))}
                      </div>
                      <span>{val.toFixed(1)}+ Stars</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer buttons: Apply & Clear Filters */}
            <div className="border-t border-border/40 bg-background pt-4 pb-safe flex gap-3">
              <button
                onClick={handleClearLocalFilters}
                className="flex-1 rounded-full border border-border bg-card py-3 text-xs font-bold text-foreground hover:bg-muted transition"
              >
                Clear Filters
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex-1 rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/95 transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  )
}

