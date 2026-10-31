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

export interface ExtractionMetadata {
  target_year: number;
  history_start: number;
  municipalities: number;
  real_records: number;
  synthetic_records: number;
  completed_at?: string;
  generated_at?: string;
  source_counts?: Record<string, number>;
  records_by_data_year?: Record<string, number>;
  synthetic_cities?: Array<{ ibge_code: string; city_name: string; uf: string }>;
}

/** Human-readable extraction summary shown on the home page and footer. */
export function getLocalExtractionMetadata(): ExtractionMetadata | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "extraction_metadata.json");
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as ExtractionMetadata;
    }
  } catch (err) {
    console.error("Error reading extraction metadata:", err);
  }
  return null;
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
