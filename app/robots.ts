import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/transactions",
          "/goals",
          "/reports",
          "/categories",
          "/payment-methods",
          "/settings",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://dragg-finance.vercel.app/sitemap.xml",
  };
}
