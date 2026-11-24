import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics | Rasi Automobiles" },
      { name: "description", content: "Daily sales, GST reports, profit margins, stock valuation, and balance aging." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RasiWorkspace initialPage="reports" />,
});
