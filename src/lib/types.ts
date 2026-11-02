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

/**
 * INEP Censo Escolar: matrículas da Educação Básica por dependência
 * administrativa. `public_total` soma federal + estadual + municipal.
 */
export interface EducationStudents {
  year: number;
  public_total: number;
  federal: number;
  estadual: number;
  municipal: number;
  private: number;
}

/**
 * SICONFI MSC Orçamentária (MSCE): despesa empenhada na função 12 (Educação)
 * e a parcela de natureza 3.1 (pessoal e encargos), sem as transferências
 * intra-orçamentárias.
 */
export interface EducationPersonnel {
  year: number;
  percentage: number;
  personnel_expense: number;
  education_expense: number;
}

export interface CityEducation {
  students?: EducationStudents;
  personnel?: EducationPersonnel;
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
  education?: CityEducation;
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
  /** Matrículas na rede pública (INEP Censo Escolar). */
  students_public_total?: number | null;
  /** % da despesa de Educação gasta com pessoal e encargos (SICONFI MSC). */
  education_personnel_percentage?: number | null;
  /** Exercício do dado de pessoal na Educação (0 quando indisponível). */
  education_personnel_year?: number;
  /** Despesa empenhada na Educação (função 12) e a parcela de pessoal. */
  education_expense?: number | null;
  education_personnel_expense?: number | null;
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
