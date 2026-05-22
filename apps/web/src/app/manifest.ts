import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LudiGest — Ludothèque BRED",
    short_name: "LudiGest",
    description: "Gérez les emprunts de la ludothèque BRED",
    start_url: "/games",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#C8102E",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
