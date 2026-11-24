import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Spare Parts Catalog | Rasi Automobiles" },
      { name: "description", content: "Automobile spare parts, OEM numbers, HSN, stock levels, and barcode stickers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RasiWorkspace initialPage="products" />,
});
