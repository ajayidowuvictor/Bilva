import type { MetadataRoute } from "next";

// Lets people install Bilva on their phone or computer like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bilva",
    short_name: "Bilva",
    description:
      "Strategy before writing. Turn a rough business idea into persuasive copy.",
    start_url: "/projects",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#01002a",
    theme_color: "#01002a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
