import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, RefreshCw, Truck, ShieldCheck, HelpCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getHomepageConfig } from "@/lib/homepage";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Support — Kura" }] }),
  component: HelpPage,
});

function HelpPage() {
  const { data: homeConfig, isLoading } = useQuery({
    queryKey: ["homepage-config"],
    queryFn: () => getHomepageConfig(),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center space-y-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-ink-muted animate-pulse">Loading help & support...</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const faqs = homeConfig?.faq_items && homeConfig.faq_items.length > 0
    ? homeConfig.faq_items
    : [
        {
          id: "1",
          question: "How long does shipping take?",
          answer: "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping is automatically applied to orders over ₹999.",
        },
        {
          id: "2",
          question: "Can I return a product?",
          answer: "Yes, we accept returns within 14 days of delivery. The item must be unused, in its original packaging, and with all tags intact.",
        },
        {
          id: "3",
          question: "How do I track my order status?",
          answer: "Go to your Orders page by tapping the Orders tile in your Account, or by navigating to /orders. There, you can view the status of each order: Placed, Shipped, or Delivered.",
        },
        {
          id: "4",
          question: "Who is the seller on Kura?",
          answer: "Kura is a single-seller boutique, meaning all products are directly handpicked, verified, and shipped by me (the store owner). This guarantees consistent quality and support.",
        },
      ];

  const deliveryPolicy = homeConfig?.delivery_policy || "Free shipping on orders above ₹999. Quick shipping and dispatch.";
  const returnPolicy = homeConfig?.return_policy || "Easy returns within 14 days. Quick replacement process.";
  const contactEmail = homeConfig?.contact_email || "support@kura.com";
  const contactPhone = homeConfig?.contact_phone || "+91 98765 43210";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/account">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Help & Support</h1>
            <p className="text-sm text-ink-muted">Find answers to common questions or reach out directly</p>
          </div>
        </div>

        {/* Support Grid Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <Truck className="mx-auto h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Delivery Policy</h3>
            <p className="text-xs text-ink-muted mt-1">{deliveryPolicy}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <RefreshCw className="mx-auto h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm">14-Day Returns</h3>
            <p className="text-xs text-ink-muted mt-1">{returnPolicy}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Secure Payment</h3>
            <p className="text-xs text-ink-muted mt-1">100% secure checkout and sandbox testing.</p>
          </div>
        </div>

        {/* FAQs */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-8">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
          </h2>
          <div className="space-y-4 divide-y divide-border/40">
            {faqs.map((faq, idx) => (
              <div key={faq.id || idx} className="pt-4 first:pt-0">
                <h3 className="font-semibold text-sm text-foreground mb-1">{faq.question}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form or details */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
          <h2 className="font-display text-lg font-bold mb-2">Still need help?</h2>
          <p className="text-xs text-ink-muted mb-6">Reach out to the store owner directly. I'll get back to you within 24 hours.</p>
          
          <div className="flex flex-wrap justify-center gap-6">
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
              <Mail className="h-4 w-4" /> {contactEmail}
            </a>
            <span className="text-border">|</span>
            <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
              <Phone className="h-4 w-4" /> {contactPhone}
            </a>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
