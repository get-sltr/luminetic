import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/analyze", "/history", "/completeness", "/memory", "/review-packet"],
      },
    ],
    sitemap: "https://luminetic.io/sitemap.xml",
  };
}
