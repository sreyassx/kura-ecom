import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, ArrowLeft, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "My Saved Addresses — Kura" }] }),
  component: SavedAddressesPage,
});

interface Address {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

function SavedAddressesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Address list from metadata
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null); // null means "adding new" unless formOpen is false
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [makeDefault, setMakeDefault] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      setAddresses(user.user_metadata?.addresses || []);
      setDefaultAddress(user.user_metadata?.shipping_address || null);
    }
  }, [user]);

  const openAddForm = () => {
    setEditIndex(null);
    setFullName("");
    setPhone("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setCountry("India");
    setMakeDefault(addresses.length === 0); // make default if it is the first address
    setFormOpen(true);
  };

  const openEditForm = (idx: number) => {
    const addr = addresses[idx];
    setEditIndex(idx);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setAddress(addr.address);
    setCity(addr.city);
    setPostalCode(addr.postalCode);
    setCountry(addr.country);
    
    // Check if this is current default
    const isDefault = defaultAddress && 
      defaultAddress.address === addr.address && 
      defaultAddress.postalCode === addr.postalCode;
    setMakeDefault(!!isDefault);
    setFormOpen(true);
  };

  const deleteAddress = async (idx: number) => {
    if (!user) return;
    const target = addresses[idx];
    const newAddresses = addresses.filter((_, i) => i !== idx);

    // If deleting default, assign a new default if another address exists
    let newDefault = defaultAddress;
    const isDefault = defaultAddress && 
      defaultAddress.address === target.address && 
      defaultAddress.postalCode === target.postalCode;
    if (isDefault) {
      newDefault = newAddresses.length > 0 ? newAddresses[0] : null;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: newAddresses,
          shipping_address: newDefault,
        },
      });

      if (error) throw error;

      setAddresses(newAddresses);
      setDefaultAddress(newDefault);
      toast.success("Address deleted successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const setAsDefault = async (idx: number) => {
    if (!user) return;
    const target = addresses[idx];
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          shipping_address: target,
        },
      });

      if (error) throw error;

      setDefaultAddress(target);
      toast.success("Set as default shipping address");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName || !phone || !address || !city || !postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    const newAddress: Address = {
      fullName,
      phone,
      address,
      city,
      postalCode,
      country,
    };

    let updatedAddresses = [...addresses];
    if (editIndex !== null) {
      // Editing
      updatedAddresses[editIndex] = newAddress;
    } else {
      // Adding new
      updatedAddresses = [newAddress, ...updatedAddresses];
    }

    // Assign default if selected or if it's the only address
    let newDefault = defaultAddress;
    if (makeDefault || updatedAddresses.length === 1) {
      newDefault = newAddress;
    } else if (editIndex !== null) {
      // If we edited the one that was default, update the default details
      const oldAddress = addresses[editIndex];
      const wasDefault = defaultAddress && 
        defaultAddress.address === oldAddress.address && 
        defaultAddress.postalCode === oldAddress.postalCode;
      if (wasDefault) {
        newDefault = newAddress;
      }
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: updatedAddresses,
          shipping_address: newDefault,
        },
      });

      if (error) throw error;

      setAddresses(updatedAddresses);
      setDefaultAddress(newDefault);
      setFormOpen(false);
      toast.success(editIndex !== null ? "Address updated successfully" : "Address saved successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/account">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">Saved Addresses</h1>
            <p className="text-sm text-ink-muted">Manage your delivery locations for faster checkout</p>
          </div>
          {!formOpen && (
            <Button onClick={openAddForm} className="rounded-full flex items-center gap-1.5" size="sm">
              <Plus className="h-4 w-4" /> Add Address
            </Button>
          )}
        </div>

        {/* Collapsible Address Form */}
        {formOpen && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-md animate-fadeIn">
            <h3 className="font-display text-lg font-bold mb-4">
              {editIndex !== null ? "Edit Address" : "Add New Address"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Full name *</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Phone number *</span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Address Line 1 *</span>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No, Apartment, Street name"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">City *</span>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Postal code *</span>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="400001"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-xs uppercase tracking-wider text-ink-muted">Country *</span>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="defaultAddress"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                  disabled={addresses.length === 0} // always default if first address
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="defaultAddress" className="text-xs text-ink-muted select-none">
                  Set as default shipping address
                </label>
              </div>

              <div className="flex gap-3 border-t border-border/40 pt-4">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-full flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-full flex-1">
                  {saving ? "Saving..." : "Save Address"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses list */}
        {addresses.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <MapPin className="mx-auto h-12 w-12 text-ink-muted/50" />
            <h2 className="mt-4 font-display text-xl font-bold">No saved addresses</h2>
            <p className="mt-2 text-sm text-ink-muted">You haven't saved any shipping locations yet.</p>
            <div className="mt-6">
              <Button onClick={openAddForm} className="rounded-full flex items-center gap-1.5 mx-auto">
                <Plus className="h-4 w-4" /> Add Address
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((addr, idx) => {
              const isDefault = defaultAddress && 
                defaultAddress.address === addr.address && 
                defaultAddress.postalCode === addr.postalCode;

              return (
                <div
                  key={idx}
                  className={`relative rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                    isDefault ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-semibold text-sm sm:text-base text-foreground leading-tight">
                        {addr.fullName}
                      </span>
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <Star className="h-2.5 w-2.5 fill-primary" /> Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-muted space-y-1">
                      <p>{addr.address}</p>
                      <p>
                        {addr.city} - {addr.postalCode}
                      </p>
                      <p>{addr.country}</p>
                      <p className="pt-2 text-[10px]">Phone: {addr.phone}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-ink-muted hover:text-foreground"
                        onClick={() => openEditForm(idx)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-ink-muted hover:text-destructive"
                        onClick={() => deleteAddress(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {!isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-[10px] h-7 px-2.5"
                        onClick={() => setAsDefault(idx)}
                      >
                        Set as Default
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
