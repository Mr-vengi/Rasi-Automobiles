import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory & Alerts | Rasi Automobiles" },
      { name: "description", content: "Real-time stock tracking, low-stock alerts, reorder calculations, and audited movement logs." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RasiWorkspace initialPage="inventory" />,
});
