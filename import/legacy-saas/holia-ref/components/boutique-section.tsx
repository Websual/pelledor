"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Euro, Plus } from "lucide-react";
import { Button } from "@/components/ui";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  stock: number;
  image_url: string | null;
}

interface BoutiqueSectionProps {
  products: Product[];
  practitionerId: string;
  practitionerSlug: string;
  onAddToCart?: (productId: string, quantity: number) => void;
}

function formatPrice(cents: number) {
  if (cents === 0) return "Gratuit";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function BoutiqueSection({
  products,
  practitionerId,
  practitionerSlug,
}: BoutiqueSectionProps) {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handleBuy = async (product: Product) => {
    setPurchasingId(product.id);
    try {
      const res = await fetch("/api/stripe/create-product-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId,
          items: [{ productId: product.id, quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      alert(err?.message || "Une erreur est survenue");
    } finally {
      setPurchasingId(null);
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section id="boutique" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sable">
        <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold font-heading text-anthracite">Boutique</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="group flex flex-col rounded-2xl border border-gray-100 bg-[#fafaf9] overflow-hidden hover:shadow-md hover:border-sauge/30 transition-all duration-300"
          >
            <div className="relative aspect-square bg-white">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 25vw"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-sauge/5">
                  <ShoppingBag className="h-12 w-12 text-sauge/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold text-anthracite text-sm line-clamp-2 mb-1">
                {product.name}
              </h3>
              <p className="text-lg font-bold text-sauge mb-3">
                {formatPrice(product.price_cents)}
              </p>
              <Button
                size="sm"
                onClick={() => handleBuy(product)}
                disabled={purchasingId !== null || product.stock <= 0}
                className="mt-auto w-full bg-sauge hover:bg-sauge/90 text-white rounded-xl"
              >
                {purchasingId === product.id ? (
                  "Redirection..."
                ) : product.stock <= 0 ? (
                  "Épuisé"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Acheter
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
