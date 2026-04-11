import type { MetadataRoute } from "next";

const BASE = "https://www.silkrouteledger.com";
const CITIES = ["Tyre", "Damascus", "Palmyra", "Ctesiphon", "Ecbatana"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                        lastModified: now, changeFrequency: "hourly",  priority: 1.0 },
    { url: `${BASE}/calculator`,        lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/routes`,            lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/planner`,           lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/prices`,            lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/coverage`,          lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${BASE}/history`,           lastModified: now, changeFrequency: "hourly",  priority: 0.8 },
  ];

  const cityPages: MetadataRoute.Sitemap = CITIES.map((city) => ({
    url: `${BASE}/cities/${city.toLowerCase()}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages];
}
