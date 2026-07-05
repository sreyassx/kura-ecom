import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Trash2, Package, DollarSign, AlertTriangle, X, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { getHomepageConfig, updateSiteSettings, siteSettingsSchema } from "@/lib/homepage";

import React from "react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SiteLayout>
          <div className="p-8 max-w-xl mx-auto my-12 border border-red-200 bg-red-50 rounded-xl shadow-sm text-red-900">
            <h2 className="text-red-800 font-bold text-xl mb-2">Something went wrong in the Admin Panel</h2>
            <p className="text-sm mb-4">Please check the logs or retry. Below is the error description:</p>
            <pre className="text-xs bg-red-100 p-4 rounded overflow-auto font-mono whitespace-pre-wrap max-h-96">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </pre>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => this.setState({ hasError: false, error: null })}>
                Retry
              </Button>
              <Link to="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        </SiteLayout>
      );
    }

    return this.props.children;
  }
}

function AdminWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Admin />
    </ErrorBoundary>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Kura" }] }),
  component: AdminWithErrorBoundary,
});

const ORDER_STATUSES = ["placed", "shipped", "delivered"] as const;

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  
  console.log("[Admin Component] Mounting / rendering admin component:", {
    mounted: true,
    userExists: !!user,
    userId: user?.id || null,
    isAdmin: isAdmin,
    loadingState: loading
  });

  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "products" | "categories" | "orders" | "homepage" | "branding">("overview");


  useEffect(() => {
    if (loading) return;

    console.log(`[Admin Access Check] User ID: ${user?.id || 'none'}, IsAdmin state: ${isAdmin}`);

    if (!user) {
      console.warn("[Admin Access Check] Denied: User is not authenticated.");
      toast.error("Please log in to access the admin panel.");
      navigate({ to: "/auth" });
    } else if (!isAdmin) {
      console.warn(`[Admin Access Check] Denied: User ${user.id} does not have the admin role.`);
      toast.error("Access denied: You must be an administrator.");
      navigate({ to: "/auth" });
    } else {
      console.log(`✅ Admin access granted for user ${user.id}`);
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-ink-muted text-sm font-medium">Checking admin access permissions...</p>
        </div>
      </SiteLayout>
    );
  }

  if (!user || !isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-red-600">
          <p className="font-semibold text-lg">Access Denied</p>
          <p className="text-sm mt-1 text-ink-muted">You must be logged in as an administrator to view this page. Redirecting to auth...</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Admin</p>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold">Store dashboard</h1>
              <a 
                href="/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition mt-1"
              >
                Preview Live Site ↗
              </a>
            </div>
          </div>

          <div className="flex gap-1 rounded-full border border-border bg-card p-1 text-sm overflow-x-auto max-w-full">
            {(["overview", "products", "categories", "orders", "homepage", "branding"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 capitalize whitespace-nowrap ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-ink-muted hover:text-foreground"
                }`}
              >
                {t === "branding" ? "Branding & Settings" : t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {tab === "overview" && <Overview />}
          {tab === "products" && <ProductsPanel />}
          {tab === "categories" && <CategoriesPanel />}
          {tab === "orders" && <OrdersPanel />}
          {tab === "homepage" && <HomepagePanel />}
          {tab === "branding" && <BrandingPanel />}
        </div>
      </div>
    </SiteLayout>
  );
}

function Overview() {
  const { data: orders } = useQuery({
    queryKey: ["admin-orders-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("total_cents, status, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, slug")
        .lte("stock", 5)
        .order("stock", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!orders) return { total: 0, revenue: 0, pending: 0 };
    return {
      total: orders.length,
      revenue: orders.reduce((s, o) => s + (o.total_cents ?? 0), 0),
      pending: orders.filter((o) => o.status !== "delivered").length,
    };
  }, [orders]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat icon={<Package className="h-4 w-4" />} label="Total orders" value={stats.total.toString()} />
      <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={formatPrice(stats.revenue)} />
      <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Pending shipment" value={stats.pending.toString()} />

      <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock alerts
        </h3>
        {!lowStock || lowStock.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">All products well-stocked.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <Link to="/products/$slug" params={{ slug: p.slug }} className="hover:text-primary">
                  {p.name}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {p.stock} left
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

type ProductVariant = {
  id: string;
  name: string;
  value: string;
  sku?: string;
  price_adjustment?: number;
  image_url?: string;
};

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  stock: number;
  category_id: string | null;
  image_url: string;
  images: string[];
  featured: boolean;
  active: boolean;
  has_sizes?: boolean;
  sizes?: string[];
  size_guide_type?: "chart" | "image";
  size_guide_image?: string;
  size_guide_chart?: { size: string; chest: string; length: string }[];
  variants?: ProductVariant[];
  specifications?: Record<string, string>;
};

const blankForm = (): ProductForm => ({
  name: "",
  slug: "",
  description: "",
  price_cents: 0,
  compare_at_cents: null,
  stock: 0,
  category_id: null,
  image_url: "",
  images: [],
  featured: false,
  active: true,
  has_sizes: false,
  sizes: ["S", "M", "L", "XL", "2XL"],
  size_guide_type: "image",
  size_guide_image: "",
  size_guide_chart: [
    { size: "S", chest: "36 in / 91 cm", length: "28 in / 71 cm" },
    { size: "M", chest: "38 in / 96 cm", length: "29 in / 74 cm" },
    { size: "L", chest: "40 in / 101 cm", length: "30 in / 76 cm" },
    { size: "XL", chest: "42 in / 106 cm", length: "31 in / 79 cm" },
    { size: "2XL", chest: "44 in / 111 cm", length: "32 in / 81 cm" }
  ],
  variants: [],
  specifications: {}
});

function ProductsPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: ProductForm) => {
      const imagesPayload = f.has_sizes
        ? {
            urls: f.images,
            has_sizes: f.has_sizes,
            sizes: f.sizes,
            size_guide_type: f.size_guide_type,
            size_guide_image: f.size_guide_image,
            size_guide_chart: f.size_guide_chart,
          }
        : f.images;

      const payload = {
        name: f.name,
        slug: f.slug || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: f.description,
        price_cents: f.price_cents,
        compare_at_cents: f.compare_at_cents,
        stock: f.stock,
        category_id: f.category_id,
        image_url: f.image_url || null,
        images: imagesPayload,
        featured: f.featured,
        active: f.active,
        variants: f.variants || [],
        specifications: f.specifications || {},
      };

      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["homepage-products"] });
      qc.invalidateQueries({ queryKey: ["products-catalog"] });
      toast.success("Product saved");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["homepage-products"] });
      qc.invalidateQueries({ queryKey: ["products-catalog"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing(blankForm())} className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Add product
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products?.map((p: any) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image_url && <img src={p.image_url} className="h-10 w-10 rounded-lg object-cover" alt="" />}
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-muted">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">{p.categories?.name ?? "—"}</td>
                <td className="px-4 py-3">{formatPrice(p.price_cents)}</td>
                <td className="px-4 py-3">
                  <span className={p.stock <= 5 ? "font-semibold text-amber-600" : ""}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        let urls: string[] = [];
                        let hasSizes = false;
                        let sizes: string[] = ["S", "M", "L", "XL", "2XL"];
                        let sizeGuideType: "chart" | "image" = "image";
                        let sizeGuideImage = "";
                        let sizeGuideChart = [
                          { size: "S", chest: "36 in / 91 cm", length: "28 in / 71 cm" },
                          { size: "M", chest: "38 in / 96 cm", length: "29 in / 74 cm" },
                          { size: "L", chest: "40 in / 101 cm", length: "30 in / 76 cm" },
                          { size: "XL", chest: "42 in / 106 cm", length: "31 in / 79 cm" },
                          { size: "2XL", chest: "44 in / 111 cm", length: "32 in / 81 cm" }
                        ];

                        if (p.images && typeof p.images === 'object' && !Array.isArray(p.images)) {
                          const obj = p.images as any;
                          urls = Array.isArray(obj.urls) ? obj.urls : [];
                          hasSizes = !!obj.has_sizes;
                          if (Array.isArray(obj.sizes)) sizes = obj.sizes;
                          sizeGuideType = obj.size_guide_type === 'chart' ? 'chart' : 'image';
                          sizeGuideImage = obj.size_guide_image || '';
                          if (Array.isArray(obj.size_guide_chart)) sizeGuideChart = obj.size_guide_chart;
                        } else if (Array.isArray(p.images)) {
                          urls = p.images as string[];
                        }

                        setEditing({
                          id: p.id,
                          name: p.name,
                          slug: p.slug,
                          description: p.description,
                          price_cents: p.price_cents,
                          compare_at_cents: p.compare_at_cents,
                          stock: p.stock,
                          category_id: p.category_id,
                          image_url: p.image_url ?? "",
                          images: urls,
                          featured: p.featured,
                          active: p.active,
                          has_sizes: hasSizes,
                          sizes: sizes,
                          size_guide_type: sizeGuideType,
                          size_guide_image: sizeGuideImage,
                          size_guide_chart: sizeGuideChart,
                          variants: Array.isArray(p.variants) ? p.variants : [],
                          specifications: p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications) ? p.specifications : {},
                        });
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductDrawer
          form={editing}
          categories={categories ?? []}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => save.mutate(editing)}
          busy={save.isPending}
        />
      )}
    </div>
  );
}

function ProductDrawer({
  form,
  categories,
  onChange,
  onClose,
  onSave,
  busy,
}: {
  form: ProductForm;
  categories: { id: string; name: string }[];
  onChange: (f: ProductForm) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some((b) => b.name === "product-images");
      if (!hasBucket) {
        await supabase.storage.createBucket("product-images", { public: true }).catch(() => {});
      }

      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        if (data?.publicUrl) {
          newUrls.push(data.publicUrl);
        }
      }

      const currentImages = Array.isArray(form.images) ? form.images : [];
      const updatedImages = [...currentImages, ...newUrls];

      onChange({
        ...form,
        images: updatedImages,
        image_url: updatedImages[0] || "",
      });

      toast.success("Images uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteImage = (indexToRemove: number) => {
    const currentImages = Array.isArray(form.images) ? form.images : [];
    const updated = currentImages.filter((_, i) => i !== indexToRemove);
    onChange({
      ...form,
      images: updated,
      image_url: updated[0] || "",
    });
    toast.success("Image removed");
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const currentImages = Array.isArray(form.images) ? [...form.images] : [];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentImages.length) return;

    const temp = currentImages[index];
    currentImages[index] = currentImages[targetIndex];
    currentImages[targetIndex] = temp;

    onChange({
      ...form,
      images: currentImages,
      image_url: currentImages[0] || "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{form.id ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <F label="Name" value={form.name} onChange={(v) => onChange({ ...form, name: v })} />
          <F label="Slug (auto if empty)" value={form.slug} onChange={(v) => onChange({ ...form, slug: v })} />
          
          <div className="space-y-2">
            <span className="block text-sm font-medium">Product Images</span>
            
            {Array.isArray(form.images) && form.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((url, index) => (
                  <div key={url} className="relative aspect-square border border-border rounded-xl overflow-hidden group bg-surface">
                    <img src={url} className="h-full w-full object-cover" alt="" />
                    
                    {index === 0 && (
                      <span className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                        Primary
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => deleteImage(index)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-1 transition shadow-sm"
                          title="Delete image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex justify-between gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="bg-card hover:bg-muted text-foreground disabled:opacity-30 disabled:hover:bg-card rounded-md px-1.5 py-0.5 text-[10px] font-bold transition shadow-sm"
                          title="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={index === form.images.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="bg-card hover:bg-muted text-foreground disabled:opacity-30 disabled:hover:bg-card rounded-md px-1.5 py-0.5 text-[10px] font-bold transition shadow-sm"
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-4 bg-surface hover:bg-muted/50 cursor-pointer transition">
              <Upload className="h-5 w-5 text-ink-muted mb-1" />
              <span className="text-xs font-semibold text-foreground">
                {uploading ? "Uploading images..." : "Upload Image(s)"}
              </span>
              <span className="text-[10px] text-ink-muted mt-0.5">Accepts PNG, JPG, WebP</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <F label="Description" value={form.description} onChange={(v) => onChange({ ...form, description: v })} textarea />
          
          <div className="grid grid-cols-2 gap-3">
            <F
              label="Price (₹)"
              type="number"
              value={form.price_cents ? String(form.price_cents / 100) : ""}
              onChange={(v) => onChange({ ...form, price_cents: v === "" ? 0 : Math.round(Number(v) * 100) })}
            />
            <F
              label="Compare-at Price (₹)"
              type="number"
              value={form.compare_at_cents ? String(form.compare_at_cents / 100) : ""}
              onChange={(v) => onChange({ ...form, compare_at_cents: v === "" ? null : Math.round(Number(v) * 100) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F
              label="Stock"
              type="number"
              value={String(form.stock)}
              onChange={(v) => onChange({ ...form, stock: Number(v) || 0 })}
            />
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select
              value={form.category_id ?? ""}
              onChange={(e) => onChange({ ...form, category_id: e.target.value || null })}
              className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-4 pt-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.featured} onChange={(e) => onChange({ ...form, featured: e.target.checked })} /> Featured
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })} /> Active
          </label>
        </div>

        {/* Sizes & Guide Section */}
        <div className="border-t border-border/60 pt-4 mt-4 space-y-4 text-sm">
          <label className="inline-flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={!!form.has_sizes}
              onChange={(e) => onChange({ ...form, has_sizes: e.target.checked })}
            />{" "}
            Enable Size Selection (clothing, shoes, etc.)
          </label>

          {form.has_sizes && (
            <div className="rounded-xl border border-border p-4 bg-muted/10 space-y-4 animate-fadeIn">
              {/* Size List Customization */}
              <div className="space-y-1.5">
                <span className="block font-semibold text-xs text-ink-muted uppercase tracking-wider">Available Sizes</span>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {["S", "M", "L", "XL", "2XL"].map((sz) => {
                    const sizesArray = form.sizes || ["S", "M", "L", "XL", "2XL"];
                    const isChecked = sizesArray.includes(sz);
                    return (
                      <label key={sz} className="inline-flex items-center gap-1.5 font-bold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSizes = e.target.checked
                              ? [...sizesArray, sz]
                              : sizesArray.filter((s) => s !== sz);
                            onChange({ ...form, sizes: newSizes });
                          }}
                        />
                        {sz}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Size Guide Type */}
              <div className="space-y-2">
                <span className="block font-semibold text-xs text-ink-muted uppercase tracking-wider">Size Guide Type</span>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="size_guide_type"
                      checked={form.size_guide_type === "image"}
                      onChange={() => onChange({ ...form, size_guide_type: "image" })}
                    />
                    Image Link
                  </label>
                  <label className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="size_guide_type"
                      checked={form.size_guide_type === "chart"}
                      onChange={() => onChange({ ...form, size_guide_type: "chart" })}
                    />
                    Custom Chart Table
                  </label>
                </div>
              </div>

              {form.size_guide_type === "image" ? (
                <F
                  label="Size Guide Image URL"
                  value={form.size_guide_image || ""}
                  onChange={(v) => onChange({ ...form, size_guide_image: v })}
                  placeholder="e.g., https://example.com/size-guide.jpg"
                />
              ) : (
                <div className="space-y-2">
                  <span className="block font-semibold text-xs text-ink-muted uppercase tracking-wider">Chart Measurements</span>
                  <div className="space-y-2 border border-border/60 rounded-xl overflow-hidden bg-card">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60 text-ink-muted font-bold">
                          <th className="p-2.5">Size</th>
                          <th className="p-2.5">Chest</th>
                          <th className="p-2.5">Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {(form.size_guide_chart || [
                          { size: "S", chest: "36 in / 91 cm", length: "28 in / 71 cm" },
                          { size: "M", chest: "38 in / 96 cm", length: "29 in / 74 cm" },
                          { size: "L", chest: "40 in / 101 cm", length: "30 in / 76 cm" },
                          { size: "XL", chest: "42 in / 106 cm", length: "31 in / 79 cm" },
                          { size: "2XL", chest: "44 in / 111 cm", length: "32 in / 81 cm" }
                        ]).map((row, idx) => (
                          <tr key={row.size}>
                            <td className="p-2.5 font-bold">{row.size}</td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.chest}
                                onChange={(e) => {
                                  const chart = form.size_guide_chart || [
                                    { size: "S", chest: "36 in / 91 cm", length: "28 in / 71 cm" },
                                    { size: "M", chest: "38 in / 96 cm", length: "29 in / 74 cm" },
                                    { size: "L", chest: "40 in / 101 cm", length: "30 in / 76 cm" },
                                    { size: "XL", chest: "42 in / 106 cm", length: "31 in / 79 cm" },
                                    { size: "2XL", chest: "44 in / 111 cm", length: "32 in / 81 cm" }
                                  ];
                                  const newChart = [...chart];
                                  newChart[idx] = { ...newChart[idx], chest: e.target.value };
                                  onChange({ ...form, size_guide_chart: newChart });
                                }}
                                className="w-full h-8 rounded border border-border/60 px-2 text-xs bg-background focus:outline-none"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.length}
                                onChange={(e) => {
                                  const chart = form.size_guide_chart || [
                                    { size: "S", chest: "36 in / 91 cm", length: "28 in / 71 cm" },
                                    { size: "M", chest: "38 in / 96 cm", length: "29 in / 74 cm" },
                                    { size: "L", chest: "40 in / 101 cm", length: "30 in / 76 cm" },
                                    { size: "XL", chest: "42 in / 106 cm", length: "31 in / 79 cm" },
                                    { size: "2XL", chest: "44 in / 111 cm", length: "32 in / 81 cm" }
                                  ];
                                  const newChart = [...chart];
                                  newChart[idx] = { ...newChart[idx], length: e.target.value };
                                  onChange({ ...form, size_guide_chart: newChart });
                                }}
                                className="w-full h-8 rounded border border-border/60 px-2 text-xs bg-background focus:outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Variants Editor Section */}
        <div className="border-t border-border/60 pt-4 mt-4 space-y-3">
          <span className="block text-sm font-semibold text-foreground">Product Variants</span>
          <p className="text-xs text-ink-muted">Add options like Color, Size, Style with optional price adjustments and separate images.</p>
          
          <div className="space-y-3">
            {form.variants?.map((v, index) => (
              <div key={v.id || index} className="rounded-xl border border-border p-3 bg-muted/10 space-y-2 relative">
                <button
                  type="button"
                  onClick={() => {
                    const updated = (form.variants || []).filter((_, i) => i !== index);
                    onChange({ ...form, variants: updated });
                  }}
                  className="absolute top-2 right-2 text-ink-muted hover:text-destructive rounded p-1 transition"
                  title="Remove variant"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-ink-muted uppercase">Option Name</label>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => {
                        const updated = [...(form.variants || [])];
                        updated[index] = { ...updated[index], name: e.target.value };
                        onChange({ ...form, variants: updated });
                      }}
                      placeholder="e.g. Color, Size"
                      className="w-full h-8 rounded border border-border px-2 text-xs bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-ink-muted uppercase">Option Value</label>
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => {
                        const updated = [...(form.variants || [])];
                        updated[index] = { ...updated[index], value: e.target.value };
                        onChange({ ...form, variants: updated });
                      }}
                      placeholder="e.g. Red, Large"
                      className="w-full h-8 rounded border border-border px-2 text-xs bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-ink-muted uppercase">SKU (optional)</label>
                    <input
                      type="text"
                      value={v.sku || ""}
                      onChange={(e) => {
                        const updated = [...(form.variants || [])];
                        updated[index] = { ...updated[index], sku: e.target.value || undefined };
                        onChange({ ...form, variants: updated });
                      }}
                      placeholder="e.g. CHOP-RED"
                      className="w-full h-8 rounded border border-border px-2 text-xs bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-ink-muted uppercase">Price Adjustment (₹, optional)</label>
                    <input
                      type="number"
                      value={v.price_adjustment ? String(v.price_adjustment / 100) : ""}
                      onChange={(e) => {
                        const updated = [...(form.variants || [])];
                        const val = e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100);
                        updated[index] = { ...updated[index], price_adjustment: val };
                        onChange({ ...form, variants: updated });
                      }}
                      placeholder="e.g. +100 or -50"
                      className="w-full h-8 rounded border border-border px-2 text-xs bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-ink-muted uppercase">Variant Image (optional)</label>
                  <select
                    value={v.image_url || ""}
                    onChange={(e) => {
                      const updated = [...(form.variants || [])];
                      updated[index] = { ...updated[index], image_url: e.target.value || undefined };
                      onChange({ ...form, variants: updated });
                    }}
                    className="w-full h-8 rounded border border-border px-1.5 text-xs bg-background focus:outline-none"
                  >
                    <option value="">— No separate image —</option>
                    {form.images?.map((url, imgIdx) => (
                      <option key={url} value={url}>
                        Product Image {imgIdx + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newVar = {
                  id: Math.random().toString(36).substring(2, 9),
                  name: "",
                  value: "",
                };
                onChange({ ...form, variants: [...(form.variants || []), newVar] });
              }}
              className="w-full rounded-full text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Variant Option
            </Button>
          </div>
        </div>

        {/* Specifications Section */}
        <div className="border-t border-border/60 pt-4 mt-4 space-y-3">
          <span className="block text-sm font-semibold text-foreground">Specifications</span>
          <p className="text-xs text-ink-muted">Enter specifications as key-value pairs (e.g. Material: Acacia Wood).</p>
          
          <div className="space-y-2">
            {Object.entries(form.specifications || {}).map(([key, val], idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    const specs = { ...form.specifications };
                    delete specs[key];
                    specs[newKey] = val;
                    onChange({ ...form, specifications: specs });
                  }}
                  placeholder="Key (e.g. Weight)"
                  className="flex-1 h-8 rounded border border-border px-2 text-xs bg-background focus:outline-none"
                />
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const specs = { ...form.specifications };
                    specs[key] = e.target.value;
                    onChange({ ...form, specifications: specs });
                  }}
                  placeholder="Value (e.g. 2.5 kg)"
                  className="flex-1 h-8 rounded border border-border px-2 text-xs bg-background focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const specs = { ...form.specifications };
                    delete specs[key];
                    onChange({ ...form, specifications: specs });
                  }}
                  className="text-ink-muted hover:text-destructive p-1"
                  title="Delete specification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const specs = { ...form.specifications };
                let tempKey = "New Specification";
                let counter = 1;
                while (tempKey in specs) {
                  tempKey = `New Specification ${counter}`;
                  counter++;
                }
                specs[tempKey] = "";
                onChange({ ...form, specifications: specs });
              }}
              className="w-full rounded-full text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Specification Row
            </Button>
          </div>
        </div>
      </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button disabled={busy || uploading} onClick={onSave} className="rounded-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  textarea,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {textarea ? (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      )}
    </label>
  );
}

function OrdersPanel() {
  const qc = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-overview"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!orders || orders.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-ink-muted">No orders yet.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">#{o.id.slice(0, 8).toUpperCase()} · {o.full_name}</p>
              <p className="text-xs text-ink-muted">{o.email} · {new Date(o.created_at).toLocaleString()}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {o.address_line1}, {o.city} {o.postal_code}, {o.country}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatPrice(o.total_cents)}</p>
              <select
                value={o.status}
                onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value })}
                className="mt-1 rounded-full border border-border bg-background px-3 py-1 text-xs"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className="mt-3 space-y-1 text-xs text-ink-muted">
            {(o.items as any[]).map((i, idx) => (
              <li key={idx}>
                {i.quantity}× {i.name} — {formatPrice(i.priceCents * i.quantity)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order?: number;
};

const blankCategoryForm = (): CategoryForm => ({
  name: "",
  slug: "",
  description: "",
  image_url: "",
});

function CategoriesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryForm | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; name: string; count: number } | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-tab"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, category_id");
      if (error) throw error;
      return data;
    },
  });

  const getProductCount = (categoryId: string) => {
    return products?.filter((p) => p.category_id === categoryId).length || 0;
  };

  const save = useMutation({
    mutationFn: async (f: CategoryForm) => {
      const slug = f.slug || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      let nextSortOrder = f.sort_order;
      if (!f.id && nextSortOrder === undefined) {
        const maxSortOrder = categories?.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) || 0;
        nextSortOrder = maxSortOrder + 10;
      }

      const payload = {
        name: f.name,
        slug,
        description: f.description || null,
        image_url: f.image_url || null,
        sort_order: nextSortOrder ?? 0,
      };

      if (f.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories-tab"] });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["homepage-categories"] });
      qc.invalidateQueries({ queryKey: ["filter-categories"] });
      toast.success("Category saved");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ current, swapWith }: { current: any; swapWith: any }) => {
      const { error: err1 } = await supabase
        .from("categories")
        .update({ sort_order: swapWith.sort_order })
        .eq("id", current.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("categories")
        .update({ sort_order: current.sort_order })
        .eq("id", swapWith.id);
      if (err2) throw err2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories-tab"] });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["homepage-categories"] });
      qc.invalidateQueries({ queryKey: ["filter-categories"] });
      toast.success("Order updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const performDelete = useMutation({
    mutationFn: async ({ id, reassign }: { id: string; reassign: boolean }) => {
      if (reassign) {
        let uncategorizedId = "";
        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", "uncategorized")
          .maybeSingle();

        if (existing) {
          uncategorizedId = existing.id;
        } else {
          const maxSortOrder = categories?.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) || 0;
          const { data: created, error: createError } = await supabase
            .from("categories")
            .insert({
              name: "Uncategorized",
              slug: "uncategorized",
              description: "Products without a specific category.",
              sort_order: maxSortOrder + 10,
            })
            .select()
            .single();

          if (createError) throw createError;
          uncategorizedId = created.id;
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({ category_id: uncategorizedId })
          .eq("category_id", id);
        if (updateError) throw updateError;
      }

      const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories-tab"] });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["homepage-categories"] });
      qc.invalidateQueries({ queryKey: ["filter-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-products-counts"] });
      toast.success("Category deleted");
      setDeleteWarning(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDeleteClick = (c: any) => {
    const count = getProductCount(c.id);
    if (count > 0) {
      setDeleteWarning({ id: c.id, name: c.name, count });
    } else {
      if (confirm(`Delete category "${c.name}"?`)) {
        performDelete.mutate({ id: c.id, reassign: false });
      }
    }
  };

  const moveUp = (index: number) => {
    if (index === 0 || !categories) return;
    reorder.mutate({ current: categories[index], swapWith: categories[index - 1] });
  };

  const moveDown = (index: number) => {
    if (!categories || index === categories.length - 1) return;
    reorder.mutate({ current: categories[index], swapWith: categories[index + 1] });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing(blankCategoryForm())} className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Add category
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products Count</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories?.map((c: any, index: number) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {c.image_url && <img src={c.image_url} className="h-10 w-10 rounded-lg object-cover" alt="" />}
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      {c.description && <p className="text-xs text-ink-muted line-clamp-1">{c.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">{c.slug}</td>
                <td className="px-4 py-3 font-semibold">{getProductCount(c.id)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="grid h-6 w-6 place-items-center rounded bg-surface border border-border hover:bg-muted disabled:opacity-30 transition"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      disabled={!categories || index === categories.length - 1}
                      onClick={() => moveDown(index)}
                      className="grid h-6 w-6 place-items-center rounded bg-surface border border-border hover:bg-muted disabled:opacity-30 transition"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditing({
                          id: c.id,
                          name: c.name,
                          slug: c.slug,
                          description: c.description || "",
                          image_url: c.image_url || "",
                          sort_order: c.sort_order,
                        })
                      }
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryDrawer
          form={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => save.mutate(editing)}
          busy={save.isPending}
        />
      )}

      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground">Delete Category: {deleteWarning.name}</h3>
            <p className="mt-3 text-sm text-ink-muted">
              There are still <strong className="text-foreground">{deleteWarning.count} product(s)</strong> assigned to this category.
              What would you like to do?
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                variant="destructive"
                onClick={() => performDelete.mutate({ id: deleteWarning.id, reassign: true })}
                disabled={performDelete.isPending}
                className="w-full justify-center"
              >
                Reassign Products to "Uncategorized" & Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteWarning(null)}
                disabled={performDelete.isPending}
                className="w-full justify-center"
              >
                Cancel / Block Deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryDrawer({
  form,
  onChange,
  onClose,
  onSave,
  busy,
}: {
  form: CategoryForm;
  onChange: (f: CategoryForm) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some((b) => b.name === "product-images");
      if (!hasBucket) {
        await supabase.storage.createBucket("product-images", { public: true }).catch(() => {});
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      if (data?.publicUrl) {
        onChange({ ...form, image_url: data.publicUrl });
        toast.success("Category image uploaded!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{form.id ? "Edit category" : "New category"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <F label="Name" value={form.name} onChange={(v) => onChange({ ...form, name: v })} />
          <F label="Slug (auto if empty)" value={form.slug} onChange={(v) => onChange({ ...form, slug: v })} />
          <F label="Description" value={form.description} onChange={(v) => onChange({ ...form, description: v })} textarea />
          
          <div className="space-y-2">
            <span className="block text-sm font-medium">Category Image/Icon</span>
            {form.image_url && (
              <div className="relative aspect-video border border-border rounded-xl overflow-hidden bg-surface mb-2 max-w-[200px]">
                <img src={form.image_url} className="h-full w-full object-cover" alt="" />
                <button
                  type="button"
                  onClick={() => onChange({ ...form, image_url: "" })}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 transition shadow-sm"
                  title="Remove image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            
            <label className="flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-4 bg-surface hover:bg-muted/50 cursor-pointer transition max-w-[200px]">
              <Upload className="h-5 w-5 text-ink-muted mb-1" />
              <span className="text-xs font-semibold text-foreground">
                {uploading ? "Uploading..." : "Upload Image"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button disabled={busy || uploading} onClick={onSave} className="rounded-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HomepagePanel() {
  const qc = useQueryClient();
  const [badge, setBadge] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheading, setSubheading] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [trustIndicators, setTrustIndicators] = useState<string[]>([]);

  const { data: homeConfig, isLoading } = useQuery({
    queryKey: ["admin-homepage-config"],
    queryFn: () => getHomepageConfig(),
  });

  useEffect(() => {
    if (homeConfig) {
      setBadge(homeConfig.badge || "");
      setHeadline(homeConfig.headline || "");
      setSubheading(homeConfig.subheading || "");
      setAnnouncement(homeConfig.announcement_bar || "");
      setTrustIndicators(homeConfig.trust_indicators || []);
    }
  }, [homeConfig]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        badge,
        headline,
        subheading,
        announcement_bar: announcement,
        trust_indicators: trustIndicators,
        store_name: homeConfig?.store_name || "",
        store_description: homeConfig?.store_description || "",
        store_logo_url: homeConfig?.store_logo_url || "",
        contact_email: homeConfig?.contact_email || "",
        contact_phone: homeConfig?.contact_phone || "",
        delivery_policy: homeConfig?.delivery_policy || "",
        return_policy: homeConfig?.return_policy || "",
        faq_items: homeConfig?.faq_items || [],
      };

      const check = siteSettingsSchema.safeParse(payload);
      if (!check.success) {
        const errorMsg = check.error.errors.map(err => {
          const fieldName = err.path.join('.')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          return `${fieldName}: ${err.message}`;
        }).join(', ');
        throw new Error(errorMsg);
      }

      await updateSiteSettings({
        data: payload
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-homepage-config"] });
      qc.invalidateQueries({ queryKey: ["homepage-config"] });
      toast.success("Homepage content updated!");
    },
    onError: (e: any) => {
      console.error("Failed to save homepage settings:", e);
      let errorMsg = e.message || "An error occurred while saving settings.";
      
      if (e.message && (e.message.includes('[') || e.message.includes('{'))) {
        try {
          const parsed = JSON.parse(e.message);
          if (Array.isArray(parsed)) {
            errorMsg = parsed.map((err: any) => {
              const field = err.path?.join('.')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Field';
              return `${field}: ${err.message}`;
            }).join(', ');
          }
        } catch {}
      }
      
      toast.error(errorMsg);
    },
  });

  const addTrustIndicator = () => {
    setTrustIndicators([...trustIndicators, ""]);
  };

  const removeTrustIndicator = (index: number) => {
    setTrustIndicators(trustIndicators.filter((_, i) => i !== index));
  };

  const updateTrustIndicator = (index: number, val: string) => {
    const updated = [...trustIndicators];
    updated[index] = val;
    setTrustIndicators(updated);
  };

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading homepage settings...</p>;
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-display text-lg font-bold mb-4">Edit Hero & Site Settings</h3>
      
      <div className="space-y-4">
        <F label="Announcement Bar Text" value={announcement} onChange={setAnnouncement} />
        <F label="Pill / Badge Text" value={badge} onChange={setBadge} />
        <F label="Main Headline" value={headline} onChange={setHeadline} />
        <F label="Subheading / Description" value={subheading} onChange={setSubheading} textarea />

        <div className="space-y-2">
          <span className="block text-sm font-medium">Trust Indicators</span>
          <div className="space-y-2">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={indicator}
                  onChange={(e) => updateTrustIndicator(index, e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  placeholder="e.g. Fast Shipping"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTrustIndicator(index)}
                  className="text-destructive hover:bg-red-55"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTrustIndicator}
            className="mt-2 rounded-full text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Indicator
          </Button>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button disabled={save.isPending} onClick={() => save.mutate()} className="rounded-full">
          {save.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function BrandingPanel() {
  const qc = useQueryClient();
  const [storeName, setStoreName] = useState("");
  const [storeDesc, setStoreDesc] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState("");
  const [retPolicy, setRetPolicy] = useState("");
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: homeConfig, isLoading } = useQuery({
    queryKey: ["admin-homepage-config"],
    queryFn: () => getHomepageConfig(),
  });

  useEffect(() => {
    if (homeConfig) {
      setStoreName(homeConfig.store_name || "");
      setStoreDesc(homeConfig.store_description || "");
      setLogoUrl(homeConfig.store_logo_url || "");
      setEmail(homeConfig.contact_email || "");
      setPhone(homeConfig.contact_phone || "");
      setDelivery(homeConfig.delivery_policy || "");
      setRetPolicy(homeConfig.return_policy || "");
      setFaqs(homeConfig.faq_items || []);
    }
  }, [homeConfig]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded successfully!");
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      await updateSiteSettings({
        data: {
          store_name: storeName,
          store_description: storeDesc,
          store_logo_url: logoUrl,
          contact_email: email,
          contact_phone: phone,
          delivery_policy: delivery,
          return_policy: retPolicy,
          faq_items: faqs,
          // Keep hero settings
          badge: homeConfig?.badge || "",
          headline: homeConfig?.headline || "",
          subheading: homeConfig?.subheading || "",
          trust_indicators: homeConfig?.trust_indicators || [],
          announcement_bar: homeConfig?.announcement_bar || "",
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-homepage-config"] });
      qc.invalidateQueries({ queryKey: ["homepage-config"] });
      toast.success("Branding and settings updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addFAQ = () => {
    setFaqs([...faqs, { id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, question: "", answer: "" }]);
  };

  const removeFAQ = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  const updateFAQ = (id: string, field: "question" | "answer", val: string) => {
    setFaqs(faqs.map((f) => f.id === id ? { ...f, [field]: val } : f));
  };

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading branding settings...</p>;
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm space-y-8">
      {/* Store Info */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold border-b border-border/40 pb-2">Store Info</h3>
        <F label="Store Name" value={storeName} onChange={setStoreName} />
        <F label="Store Description" value={storeDesc} onChange={setStoreDesc} textarea />
        
        <div className="space-y-2">
          <span className="block text-sm font-medium">Store Logo</span>
          {logoUrl && (
            <div className="mb-2 relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
              <img src={logoUrl} alt="Store Logo Preview" className="w-full h-full object-contain" />
              <button
                onClick={() => setLogoUrl("")}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="relative flex items-center justify-center border-2 border-dashed border-border/80 rounded-2xl p-4 hover:border-primary/50 transition">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
            />
            <div className="text-center">
              <Upload className="mx-auto h-5 w-5 text-ink-muted mb-1" />
              <span className="text-xs font-semibold text-primary">
                {uploading ? "Uploading..." : "Upload Logo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold border-b border-border/40 pb-2">Contact Info</h3>
        <F label="Contact Email" value={email} onChange={setEmail} />
        <F label="Contact Phone" value={phone} onChange={setPhone} />
      </div>

      {/* Policies */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold border-b border-border/40 pb-2">Policies</h3>
        <F label="Delivery Policy" value={delivery} onChange={setDelivery} textarea />
        <F label="Return & Refund Policy" value={retPolicy} onChange={setRetPolicy} textarea />
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold border-b border-border/40 pb-2">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3 relative">
              <button
                type="button"
                onClick={() => removeFAQ(faq.id)}
                className="absolute top-3 right-3 text-destructive hover:bg-red-50 p-1.5 rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="font-semibold text-xs text-ink-muted select-none">FAQ #{index + 1}</div>
              <input
                type="text"
                placeholder="Question"
                value={faq.question}
                onChange={(e) => updateFAQ(faq.id, "question", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <textarea
                placeholder="Answer"
                rows={3}
                value={faq.answer}
                onChange={(e) => updateFAQ(faq.id, "answer", e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFAQ}
          className="rounded-full text-xs"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ Item
        </Button>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-end border-t border-border/40 pt-4">
        <Button disabled={save.isPending || uploading} onClick={() => save.mutate()} className="rounded-full">
          {save.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

