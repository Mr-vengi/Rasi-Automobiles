import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Business overview | Rasi Automobiles" },
      { name: "description", content: "A private overview of real Rasi Automobiles sales, stock and business activity." },
      { property: "og:title", content: "Business overview | Rasi Automobiles" },
      { property: "og:description", content: "A private overview of Rasi Automobiles business activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RasiWorkspace,
});