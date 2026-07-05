import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { formatPrice } from '@/lib/format'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { Heart, ShoppingBag, Star, ChevronLeft, ChevronRight, X, MessageSquare, Calendar } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/products/$slug')({
  component: ProductDetail,
})

const defaultChart = [
  { size: "S", chest: "36 in / 91 cm", length: "28 in / 71 cm" },
  { size: "M", chest: "38 in / 96 cm", length: "29 in / 74 cm" },
  { size: "L", chest: "40 in / 101 cm", length: "30 in / 76 cm" },
  { size: "XL", chest: "42 in / 106 cm", length: "31 in / 79 cm" },
  { size: "2XL", chest: "44 in / 111 cm", length: "32 in / 81 cm" }
];

function ProductDetail() {
  const { slug } = Route.useParams()
  const { add } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [qty, setQty] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<{ [name: string]: string }>({})
  const [showSpecs, setShowSpecs] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const groupedVariants = (() => {
    const list: any[] = Array.isArray(product?.variants) ? product.variants : [];
    const groups: { [name: string]: any[] } = {};
    for (const v of list) {
      if (!v.name || !v.value) continue;
      if (!groups[v.name]) groups[v.name] = [];
      if (!groups[v.name].some((x) => x.value === v.value)) {
        groups[v.name].push(v);
      }
    }
    return groups;
  })();

  const calculatedPriceCents = (() => {
    let price = product?.price_cents || 0;
    const list: any[] = Array.isArray(product?.variants) ? product.variants : [];
    Object.entries(selectedOptions).forEach(([name, val]) => {
      const matched = list.find((v) => v.name === name && v.value === val);
      if (matched && matched.price_adjustment) {
        price += matched.price_adjustment;
      }
    });
    return price;
  })();

  const handleSelectOption = (groupName: string, value: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [groupName]: value };
      const list: any[] = Array.isArray(product?.variants) ? product.variants : [];
      const matched = list.find((v) => v.name === groupName && v.value === value);
      if (matched && matched.image_url) {
        const idx = images.indexOf(matched.image_url);
        if (idx !== -1) {
          scrollToImage(idx);
        }
      }
      return next;
    });
  };

  // Parse size configuration from product.images
  const sizeConfig = (() => {
    let urls: string[] = [];
    let hasSizes = false;
    let sizes: string[] = ["S", "M", "L", "XL", "2XL"];
    let sizeGuideType: 'chart' | 'image' = 'image';
    let sizeGuideImage = '';
    let sizeGuideChart: any[] = [];

    if (product) {
      const imagesJson = product.images;
      if (imagesJson && typeof imagesJson === 'object' && !Array.isArray(imagesJson)) {
        const obj = imagesJson as any;
        urls = Array.isArray(obj.urls) ? obj.urls : [];
        hasSizes = !!obj.has_sizes;
        if (Array.isArray(obj.sizes)) {
          sizes = obj.sizes;
        }
        sizeGuideType = obj.size_guide_type === 'chart' ? 'chart' : 'image';
        sizeGuideImage = typeof obj.size_guide_image === 'string' ? obj.size_guide_image : '';
        sizeGuideChart = Array.isArray(obj.size_guide_chart) ? obj.size_guide_chart : [];
      } else if (Array.isArray(imagesJson)) {
        urls = imagesJson as string[];
      }

      if (urls.length === 0 && product.image_url) {
        urls = [product.image_url];
      }
    }
    return { urls, hasSizes, sizes, sizeGuideType, sizeGuideImage, sizeGuideChart };
  })();

  const { urls: images, hasSizes, sizes, sizeGuideType, sizeGuideImage, sizeGuideChart } = sizeConfig;

  // Query reviews
  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product!.id)
        .order('created_at', { ascending: false });
      
      if (reviewsErr) throw reviewsErr;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Fetch profiles in a separate query to bypass lack of foreign key relation in REST join
      const userIds = Array.from(new Set(reviewsData.map(r => r.user_id)));
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesErr) {
        console.error("Error fetching profiles for reviews:", profilesErr);
      }

      const profileMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

      return reviewsData.map(r => ({
        ...r,
        profiles: {
          full_name: profileMap.get(r.user_id) || 'Anonymous Customer'
        }
      }));
    }
  })

  // Query whether user has ordered this product
  const { data: hasPurchased } = useQuery({
    queryKey: ['has-purchased', product?.id, user?.id],
    enabled: !!product && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .eq('user_id', user!.id);
      if (error) throw error;
      if (!data) return false;
      
      for (const order of data) {
        const items = order.items as any[] || [];
        if (items.some((item: any) => item.productId === product!.id)) {
          return true;
        }
      }
      return false;
    }
  })

  // Query whether user has already left a review
  const { data: existingReview } = useQuery({
    queryKey: ['existing-review', product?.id, user?.id],
    enabled: !!product && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  })

  // Calculate dynamic stats
  const totalReviewsCount = reviews?.length || 0;
  const overallRating = totalReviewsCount > 0
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount
    : product?.rating || 0;

  const ratingDistribution = [0, 0, 0, 0, 0];
  reviews?.forEach(r => {
    const starIndex = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
    ratingDistribution[starIndex]++;
  });

  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToImage = (index: number) => {
    setActiveIndex(index);
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const width = container.offsetWidth;
    if (width > 0) {
      const index = Math.round(container.scrollLeft / width);
      if (index !== activeIndex && index >= 0 && index < images.length) {
        setActiveIndex(index);
      }
    }
  };

  const { data: wishlistEntry } = useQuery({
    queryKey: ['wishlist-item', product?.id, user?.id],
    enabled: !!product && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('product_id', product!.id)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const toggleWishlist = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Please sign in to save items to your wishlist')
        return
      }
      if (wishlistEntry) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('product_id', product!.id)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert({
            product_id: product!.id,
            user_id: user.id,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-item', product?.id, user?.id] })
      queryClient.invalidateQueries({ queryKey: ['wishlist', user?.id] })
      toast.success(wishlistEntry ? 'Removed from wishlist' : 'Saved to wishlist')
    },
  })

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-ink-muted">
          Loading product details...
        </div>
      </SiteLayout>
    )
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-ink-muted">
          Product not found.
        </div>
      </SiteLayout>
    )
  }

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      toast.error('Please select a size first!')
      return
    }

    const optionNames = Object.keys(groupedVariants);
    const missing = optionNames.filter((name) => !selectedOptions[name]);
    if (missing.length > 0) {
      toast.error(`Please select a ${missing[0]} first!`);
      return;
    }

    const list: any[] = Array.isArray(product.variants) ? product.variants : [];
    const selectedVariantsList = optionNames.map(name => {
      const val = selectedOptions[name];
      return list.find(v => v.name === name && v.value === val);
    }).filter(Boolean);

    const combinedVariant = selectedVariantsList.length > 0
      ? {
          id: selectedVariantsList.map(v => v.id).join('-'),
          name: selectedVariantsList.map(v => v.name).join(' / '),
          value: selectedVariantsList.map(v => v.value).join(' / '),
          price_adjustment: selectedVariantsList.reduce((sum, v) => sum + (v.price_adjustment || 0), 0),
          image_url: selectedVariantsList.find(v => v.image_url)?.image_url,
          sku: selectedVariantsList.find(v => v.sku)?.sku
        }
      : null;

    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: calculatedPriceCents,
        imageUrl: combinedVariant?.image_url || images[activeIndex] || product.image_url,
        size: selectedSize || undefined,
        variant: combinedVariant,
      },
      qty
    )

    let variantLabel = '';
    if (selectedSize) variantLabel += ` (${selectedSize})`;
    if (combinedVariant) variantLabel += ` [${combinedVariant.value}]`;

    toast.success(`${product.name}${variantLabel} added to cart`)
  }

  const handleBuyNow = () => {
    if (hasSizes && !selectedSize) {
      toast.error('Please select a size first!')
      return
    }

    const optionNames = Object.keys(groupedVariants);
    const missing = optionNames.filter((name) => !selectedOptions[name]);
    if (missing.length > 0) {
      toast.error(`Please select a ${missing[0]} first!`);
      return;
    }

    const list: any[] = Array.isArray(product.variants) ? product.variants : [];
    const selectedVariantsList = optionNames.map(name => {
      const val = selectedOptions[name];
      return list.find(v => v.name === name && v.value === val);
    }).filter(Boolean);

    const combinedVariantVal = selectedVariantsList.length > 0
      ? selectedVariantsList.map(v => v.value).join(' / ')
      : undefined;

    navigate({
      to: '/cart',
      search: {
        buyNow: product!.slug,
        qty: qty,
        size: selectedSize || undefined,
        variant: combinedVariantVal
      },
    })
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: product.id,
          user_id: user.id,
          rating: reviewRating,
          comment: reviewComment.trim() || null
        });
      
      if (error) throw error;

      toast.success("Review submitted successfully!");
      setReviewComment("");
      refetchReviews();
      queryClient.invalidateQueries({ queryKey: ['existing-review', product.id, user.id] });

      // Update overall product stats
      try {
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('product_id', product.id);

        if (allReviews && allReviews.length > 0) {
          const newCount = allReviews.length;
          const newAvgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / newCount;

          await supabase
            .from('products')
            .update({
              rating: newAvgRating,
              reviews_count: newCount
            })
            .eq('id', product.id);

          queryClient.invalidateQueries({ queryKey: ['product', slug] });
        }
      } catch (dbErr) {
        console.error("Failed to update product rating stats", dbErr);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image Gallery */}
          <div>
            <div className="relative group overflow-hidden rounded-2xl border border-border bg-surface aspect-square shadow-sm max-h-[350px] md:max-h-[500px] w-full">
              {images.length > 0 ? (
                <>
                  {/* Scrollable image container */}
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {images.map((url, i) => (
                      <div key={url} className="h-full w-full min-w-full max-w-full shrink-0 snap-center select-none flex items-center justify-center bg-surface overflow-hidden">
                        <img
                          src={url}
                          alt={`${product.name} - image ${i + 1}`}
                          className="pointer-events-none"
                          style={{
                            maxHeight: windowWidth >= 768 ? '500px' : '350px',
                            maxWidth: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Left/Right Chevrons (only if more than 1 image) */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => scrollToImage(Math.max(0, activeIndex - 1))}
                        disabled={activeIndex === 0}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-all focus:outline-none hover:scale-105 hover:bg-background active:scale-95 ${
                          activeIndex === 0
                            ? "opacity-0 pointer-events-none"
                            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        }`}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => scrollToImage(Math.min(images.length - 1, activeIndex + 1))}
                        disabled={activeIndex === images.length - 1}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-all focus:outline-none hover:scale-105 hover:bg-background active:scale-95 ${
                          activeIndex === images.length - 1
                            ? "opacity-0 pointer-events-none"
                            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        }`}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* Dot Indicators */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 rounded-full bg-background/40 px-3 py-1.5 backdrop-blur-sm">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => scrollToImage(i)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            activeIndex === i ? "w-4 bg-primary" : "w-1.5 bg-foreground/35 hover:bg-foreground/60"
                          }`}
                          aria-label={`Go to image ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid h-full w-full place-items-center text-ink-muted">
                  No Image Available
                </div>
              )}
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
                {images.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => scrollToImage(i)}
                    className={`relative h-16 w-16 rounded-xl border overflow-hidden shrink-0 transition bg-surface ${
                      activeIndex === i
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <img src={url} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {product.categories?.name ?? 'General'}
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="mt-3 flex items-center gap-1 text-sm text-ink-muted">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{overallRating.toFixed(1)}</span>
                <span>·</span>
                <span>{totalReviewsCount} reviews</span>
              </div>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(calculatedPriceCents)}
                </span>
                {product.compare_at_cents && product.compare_at_cents > product.price_cents && (
                  <span className="text-sm text-ink-muted line-through">
                    {formatPrice(product.compare_at_cents + (calculatedPriceCents - product.price_cents))}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mt-6 border-t border-border/60 pt-6">
                <h3 className="text-sm font-semibold text-foreground">Description</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Specifications Section */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mt-6 border-t border-border/60 pt-6">
                  {/* Mobile Collapsible */}
                  <div className="md:hidden">
                    <button
                      type="button"
                      onClick={() => setShowSpecs(!showSpecs)}
                      className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground focus:outline-none"
                    >
                      <span>Specifications</span>
                      {showSpecs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showSpecs && (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card animate-fadeIn">
                        <table className="w-full text-xs text-left border-collapse">
                          <tbody className="divide-y divide-border/30">
                            {Object.entries(product.specifications).map(([k, v]) => (
                              <tr key={k} className="hover:bg-muted/10">
                                <td className="p-3 font-semibold text-ink-muted w-1/3 bg-muted/20">{k}</td>
                                <td className="p-3 text-foreground font-normal">{v as string}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Desktop Always Visible */}
                  <div className="hidden md:block">
                    <h3 className="text-sm font-semibold text-foreground font-display font-bold">Specifications</h3>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                      <table className="w-full text-xs text-left border-collapse">
                        <tbody className="divide-y divide-border/30">
                          {Object.entries(product.specifications).map(([k, v]) => (
                            <tr key={k} className="hover:bg-muted/10">
                              <td className="p-3 font-semibold text-ink-muted w-1/3 bg-muted/20">{k}</td>
                              <td className="p-3 text-foreground font-normal">{v as string}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Variants Selector Section */}
              {Object.entries(groupedVariants).map(([groupName, items]) => {
                const isColor = groupName.toLowerCase() === 'color' || groupName.toLowerCase() === 'colour';
                return (
                  <div key={groupName} className="mt-6 border-t border-border/60 pt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">
                        Select {groupName}
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {items.map((item) => {
                        const isSelected = selectedOptions[groupName] === item.value;
                        if (isColor) {
                          const colorMap: { [key: string]: string } = {
                            red: '#ef4444',
                            blue: '#3b82f6',
                            green: '#22c55e',
                            yellow: '#eab308',
                            black: '#000000',
                            white: '#ffffff',
                            grey: '#808080',
                            gray: '#808080',
                            orange: '#f97316',
                            purple: '#a855f7',
                            brown: '#78350f',
                            pink: '#ec4899',
                            beige: '#f5f5dc',
                            cream: '#fffdd0',
                            gold: '#ffd700',
                            silver: '#c0c0c0',
                            sage: '#87a987',
                          };
                          const bgColor = colorMap[item.value.toLowerCase()] || item.value.toLowerCase();
                          const borderClass = item.value.toLowerCase() === 'white' ? 'border-border/80' : 'border-transparent';
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => handleSelectOption(groupName, item.value)}
                              className={`relative h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center ${
                                isSelected
                                  ? 'border-primary ring-2 ring-primary/20 scale-110 shadow-sm'
                                  : 'border-border/40 hover:scale-105 hover:border-foreground/30'
                              }`}
                              title={item.value}
                            >
                              <span
                                className={`h-7 w-7 rounded-full border ${borderClass}`}
                                style={{ backgroundColor: bgColor }}
                              />
                            </button>
                          );
                        }
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => handleSelectOption(groupName, item.value)}
                            className={`min-w-12 h-10 px-4 rounded-full border text-xs font-bold transition flex items-center justify-center ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                                : "border-border bg-card text-foreground hover:border-foreground/40 active:scale-95"
                            }`}
                          >
                            {item.value}
                            {item.price_adjustment && item.price_adjustment > 0 ? (
                              <span className="ml-1 text-[9px] opacity-90">
                                (+{formatPrice(item.price_adjustment)})
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Size Selector Section */}
              {hasSizes && (
                <div className="mt-6 border-t border-border/60 pt-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      Select Size
                    </label>
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="text-xs font-semibold text-primary hover:underline transition"
                    >
                      Size Guide
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`min-w-12 h-10 px-3 rounded-full border text-xs font-bold transition flex items-center justify-center ${
                          selectedSize === s
                            ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                            : "border-border bg-card text-foreground hover:border-foreground/40 active:scale-95"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-border/60 pt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                {/* Quantity Selector */}
                {product.stock > 0 && (
                  <div className="flex items-center rounded-full border border-border px-3 py-1.5 text-sm">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="px-2 font-bold hover:text-primary"
                    >
                      -
                    </button>
                    <span className="px-3 font-semibold">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                      className="px-2 font-bold hover:text-primary"
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Wishlist Button */}
                <Button
                  onClick={() => toggleWishlist.mutate()}
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0 ml-auto"
                  aria-label="Wishlist"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      wishlistEntry ? 'fill-primary text-primary' : 'text-foreground'
                    }`}
                  />
                </Button>
              </div>

              {/* Purchase Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {product.stock > 0 ? (
                  <>
                    <Button
                      onClick={handleAddToCart}
                      variant="outline"
                      size="lg"
                      className="flex-1 rounded-full gap-2 border-primary text-primary hover:bg-primary/5 order-2 sm:order-1 h-auto py-4 text-base font-semibold"
                    >
                      <ShoppingBag className="h-5 w-5" /> Add to Cart
                    </Button>
                    <Button
                      onClick={handleBuyNow}
                      size="lg"
                      className="flex-1 rounded-full gap-2 order-1 sm:order-2 h-auto py-4 text-base font-semibold"
                    >
                      Buy Now
                    </Button>
                  </>
                ) : (
                  <Button disabled size="lg" className="w-full rounded-full h-auto py-4 text-base font-semibold">
                    Out of Stock
                  </Button>
                )}
              </div>

              {/* Stock status indicator */}
              <p className="mt-2 text-xs text-ink-muted">
                {product.stock > 0 ? `${product.stock} items remaining` : 'Temporarily unavailable'}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t border-border/60 pt-10">
          <div className="grid gap-12 lg:grid-cols-12">
            
            {/* Reviews Summary Stats */}
            <div className="lg:col-span-4 space-y-6">
              <h2 className="font-display text-2xl font-bold tracking-tight">Customer Reviews</h2>
              
              <div className="flex items-center gap-4 bg-muted/20 rounded-2xl border p-5">
                <div className="text-center shrink-0">
                  <p className="text-5xl font-black text-foreground">{overallRating.toFixed(1)}</p>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= Math.round(overallRating) ? "fill-amber-400 text-amber-400" : "text-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-ink-muted mt-1.5">{totalReviewsCount} reviews</p>
                </div>

                <div className="flex-1 min-w-0 border-l border-border/50 pl-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingDistribution[stars - 1] || 0;
                    const percent = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="w-3 text-right font-bold text-foreground">{stars}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        <div className="h-2 flex-1 rounded-full bg-border/40 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="w-6 text-right shrink-0">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Review Write Form Option */}
              <div className="border border-border rounded-2xl bg-card p-5 space-y-4">
                <h3 className="font-semibold text-sm">Share your thoughts</h3>
                <p className="text-xs text-ink-muted">If you've purchased this product, you can leave a review to share your feedback.</p>
                
                {user ? (
                  hasPurchased ? (
                    existingReview ? (
                      <div className="rounded-xl bg-muted/30 border border-dashed p-4 text-center">
                        <p className="text-xs font-semibold text-ink-muted">You have already submitted a review for this product.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-ink-muted uppercase">Your Rating</label>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(null)}
                                className="focus:outline-none transition hover:scale-110 active:scale-95"
                              >
                                <Star
                                  className={`h-6 w-6 ${
                                    star <= (hoverRating ?? reviewRating)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-border"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="review-comment" className="text-xs font-bold text-ink-muted uppercase">Write your comment</label>
                          <textarea
                            id="review-comment"
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="What did you like or dislike? How was the quality?"
                            className="w-full rounded-xl border border-border bg-card p-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            required
                          />
                        </div>

                        <Button type="submit" disabled={isSubmittingReview} className="w-full rounded-full text-xs py-2.5">
                          {isSubmittingReview ? "Submitting..." : "Submit Review"}
                        </Button>
                      </form>
                    )
                  ) : (
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 text-center">
                      <p className="text-xs font-semibold text-amber-600">Only verified buyers who have ordered this item can leave a review.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center pt-2">
                    <Link to="/auth">
                      <Button variant="outline" className="w-full rounded-full text-xs border-primary text-primary hover:bg-primary/5">
                        Sign in to leave a review
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-8 space-y-6">
              <h3 className="font-display text-lg font-bold border-b border-border/40 pb-2">
                All Reviews ({totalReviewsCount})
              </h3>
              
              {!reviews || reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-ink-muted">
                  <MessageSquare className="h-10 w-10 text-ink-muted/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No reviews yet</p>
                  <p className="text-xs mt-1">Be the first to review this product!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="py-5 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs select-none">
                            {(rev.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {rev.profiles?.full_name || 'Anonymous Customer'}
                            </p>
                            <div className="flex gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-border"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-ink-muted flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(rev.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      
                      {rev.comment && (
                        <p className="text-xs text-ink-muted leading-relaxed pl-10 font-normal">
                          {rev.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl animate-scaleUp">
            <button
              onClick={() => setShowSizeGuide(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-ink-muted hover:bg-muted hover:text-foreground transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl font-bold mb-4">Size Guide</h3>
            <p className="text-xs text-ink-muted mb-6">
              Compare your measurements against our sizing chart below to find your perfect fit.
            </p>
            
            <div className="overflow-x-auto max-h-[350px] scrollbar-thin">
              {sizeGuideType === 'image' && sizeGuideImage ? (
                <img src={sizeGuideImage} alt="Size Guide" className="w-full h-auto rounded-xl object-contain border border-border" />
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-ink-muted">
                      <th className="p-3">Size</th>
                      <th className="p-3">Chest</th>
                      <th className="p-3">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {(sizeGuideChart.length > 0 ? sizeGuideChart : defaultChart).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-3 font-bold text-foreground">{row.size}</td>
                        <td className="p-3 text-ink-muted">{row.chest}</td>
                        <td className="p-3 text-ink-muted">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  )
}

