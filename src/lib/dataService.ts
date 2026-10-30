import fs from "fs";
import path from "path";
import { CityData, CityIndexItem, BrazilSummaryItem } from "./types";
import { publicDataPath } from "./paths";

export function getLocalCitiesIndex(): CityIndexItem[] {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "cities_index.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as CityIndexItem[];
    }
  } catch (err) {
    console.error("Error reading local cities index:", err);
  }
  return [];
}

export function getLocalBrazilSummary(): BrazilSummaryItem[] {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "brazil_summary.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as BrazilSummaryItem[];
    }
  } catch (err) {
    console.error("Error reading brazil summary:", err);
  }
  return [];
}

export function getLocalCityData(ibgeCode: string): CityData | null {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "cities",
      `${ibgeCode}.json`
    );
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as CityData;
    }
  } catch (err) {
    console.error(`Error reading local city data for ${ibgeCode}:`, err);
  }
  return null;
}

export async function fetchClientCityData(ibgeCode: string): Promise<CityData | null> {
  try {
    const res = await fetch(publicDataPath(`cities/${ibgeCode}.json`));
    if (res.ok) {
      return (await res.json()) as CityData;
    }
  } catch (e) {
    console.error("Failed to fetch client city data:", e);
  }
  return null;
}

export async function fetchClientCitiesIndex(): Promise<CityIndexItem[]> {
  try {
    const res = await fetch(publicDataPath("cities_index.json"));
    if (res.ok) {
      return (await res.json()) as CityIndexItem[];
    }
  } catch (e) {
    console.error("Failed to fetch client cities index:", e);
  }
  return [];
}
