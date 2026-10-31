export interface HistoricalTrendItem {
  year: number;
  total_spent_per_capita: number;
  health_per_capita: number;
}

export interface PerCapitaBreakdown {
  health: number;
  education: number;
  urbanism: number;
  administration: number;
  legislative: number;
}

export interface CitySummary {
  total_revenue: number;
  total_expense: number;
  own_revenue_percentage: number;
  transfers_revenue_percentage: number;
  personnel_expense_percentage_rcl: number;
}

export interface CityData {
  ibge_code: string;
  city_name: string;
  uf: string;
  population: number;
  fiscal_year: number;
  data_source?: string;
  extraction?: {
    source: string;
    requested_year?: number;
    data_year?: number;
    rreo_type?: string | null;
    rreo_period?: number | null;
    rreo_complete?: boolean;
    personnel_source?: string;
    rgf_period?: number | null;
    generated_at?: string;
  };
  summary: CitySummary;
  per_capita_breakdown: PerCapitaBreakdown;
  historical_trend: HistoricalTrendItem[];
}

export interface CityIndexItem {
  ibge_code: string;
  city_name: string;
  uf: string;
  region?: string;
  tier?: string;
  population: number;
  total_expense: number;
  personnel_expense_percentage_rcl: number;
}

export interface BrazilSummaryItem {
  ibge_code: string;
  city_name: string;
  uf: string;
  region: string;
  tier: string;
  population: number;
  fiscal_year: number;
  data_source?: string;
  total_revenue: number;
  total_expense: number;
  own_revenue_percentage: number;
  transfers_revenue_percentage: number;
  personnel_expense_percentage_rcl: number;
  health_per_capita: number;
  education_per_capita: number;
  urbanism_per_capita: number;
  administration_per_capita: number;
  legislative_per_capita: number;
}

export type LRFStatus = "normal" | "alerta" | "prudencial" | "critico";

export interface LRFInfo {
  status: LRFStatus;
  label: string;
  description: string;
  color: string;
  bgLight: string;
  border: string;
  textColor: string;
}
