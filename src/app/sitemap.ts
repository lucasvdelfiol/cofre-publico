import type { MetadataRoute } from "next";
import { getLocalCitiesIndex } from "@/lib/dataService";
import { SITE_URL } from "@/lib/site";

/**
 * Every municipality has its own static page, so the sitemap is generated
 * from the same index used by `generateStaticParams`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const cities = getLocalCitiesIndex();
  const lastModified = new Date();

  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/comparar/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/dicionario/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/sobre/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...cities.map((city) => ({
      url: `${SITE_URL}/cidade/${city.ibge_code}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
