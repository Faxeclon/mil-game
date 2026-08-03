import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kikiria",
    short_name: "Kikiria",
    description: "A game to look, ask and check what you find online.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#98e888",
    background_color: "#eef4ff",
    icons: [
      {
        src: "/icons/kikiria-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/kikiria-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/kikiria-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
