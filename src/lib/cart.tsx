import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
  size?: string;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: string, size?: string) => void;
  setQty: (productId: string, qty: number, size?: string) => void;
  clear: () => void;
  lastAddedAt: number;
};

const KEY = "cart.v1";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotalCents: items.reduce((s, i) => s + i.quantity * i.priceCents, 0),
      add: (item, qty = 1) => {
        setItems((prev) => {
          const existing = prev.find((p) => p.productId === item.productId && p.size === item.size);
          if (existing) {
            return prev.map((p) =>
              p.productId === item.productId && p.size === item.size
                ? { ...p, quantity: p.quantity + qty }
                : p
            );
          }
          return [...prev, { ...item, quantity: qty }];
        });
        setLastAddedAt(Date.now());
      },
      remove: (id, size) => setItems((prev) => prev.filter((p) => !(p.productId === id && p.size === size))),
      setQty: (id, qty, size) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => !(p.productId === id && p.size === size))
            : prev.map((p) => (p.productId === id && p.size === size ? { ...p, quantity: qty } : p)),
        ),
      clear: () => setItems([]),
      lastAddedAt,
    }),
    [items, lastAddedAt],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart outside provider");
  return v;
}
