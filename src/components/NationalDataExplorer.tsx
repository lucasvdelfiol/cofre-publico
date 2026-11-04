"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BrazilSummaryItem } from "@/lib/types";
import { publicDataPath } from "@/lib/paths";
import { normalize } from "@/lib/search";
import {
  formatBRL,
  formatPct,
  formatNumber,
  formatPersonnelPct,
  getLRFStatus,
} from "@/lib/civicDictionary";
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  HeartPulse,
  GraduationCap,
  Users,
  ShieldCheck,
  Building,
} from "lucide-react";

interface Props {
  /**
   * Optional server-provided rows. When omitted the explorer downloads the
   * national summary on demand so the homepage HTML stays small.
   */
  initialCities?: BrazilSummaryItem[];
  /** Reference fiscal year, used to flag rows that show an older exercise. */
  referenceYear?: number;
}

const CARD_PAGE_SIZE = 12;
const TABLE_PAGE_SIZE = 50;

function numericValue(
  city: BrazilSummaryItem,
  field: SortField
): number | null {
  const raw = city[field];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

type SortField =
  | "population"
  | "total_expense"
  | "health_per_capita"
  | "education_per_capita"
  | "personnel_expense_percentage_rcl"
  | "own_revenue_percentage"
  | "students_public_total"
  | "education_personnel_percentage";

export default function NationalDataExplorer({
  initialCities = [],
  referenceYear = 2025,
}: Props) {
  const [cities, setCities] = useState<BrazilSummaryItem[]>(initialCities);
  const [loading, setLoading] = useState(initialCities.length === 0);
  const [selectedRegion, setSelectedRegion] = useState<string>("Todas");
  const [sortField, setSortField] = useState<SortField>("total_expense");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(CARD_PAGE_SIZE);

  const pageSize = viewMode === "cards" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;

  useEffect(() => {
    if (cities.length > 0) return;
    let active = true;
    fetch(publicDataPath("brazil_summary.json"))
      .then((res) => res.json())
      .then((data: BrazilSummaryItem[]) => {
        if (active) setCities(data);
      })
      .catch((err) => console.error("Error loading national summary:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cities.length]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, selectedRegion, filterQuery, sortField, sortAsc]);

  const regions = ["Todas", "Sudeste", "Nordeste", "Sul", "Norte", "Centro-Oeste"];

  // Filter and sort cities. The query is normalized (accents stripped) and
  // split into tokens so "sao paulo" and "sao paulo sp" both work.
  const filteredCities = useMemo(() => {
    const tokens = normalize(filterQuery).split(" ").filter(Boolean);
    return cities
      .filter((c) => {
        const matchesRegion =
          selectedRegion === "Todas" || c.region === selectedRegion;
        const haystack = `${normalize(c.city_name)} ${c.uf.toLowerCase()} ${c.ibge_code}`;
        const matchesQuery =
          tokens.length === 0 || tokens.every((token) => haystack.includes(token));
        return matchesRegion && matchesQuery;
      })
      .sort((a, b) => {
        const factor = sortAsc ? 1 : -1;
        // Metrics added later are absent for some cities (e.g. no MSCE).
        // Missing values always sink to the bottom instead of sorting as 0.
        const av = numericValue(a, sortField);
        const bv = numericValue(b, sortField);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av - bv) * factor;
      });
  }, [cities, selectedRegion, filterQuery, sortField, sortAsc]);

  const visibleCities = filteredCities.slice(0, visibleCount);
  const remaining = filteredCities.length - visibleCities.length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const renderSortHeader = (field: SortField, label: string) => (
    <th
      scope="col"
      aria-sort={
        sortField === field ? (sortAsc ? "ascending" : "descending") : "none"
      }
      className="py-3 px-4 font-mono text-[10px] uppercase tracking-label"
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-bone-100 focus:outline-none focus-visible:underline"
      >
        {label}
        <span aria-hidden="true">
          {sortField === field ? (sortAsc ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Controls Bar: Regions, Search filter, Sorting, View mode */}
      <div className="bg-ink-850 rounded-xl p-4 sm:p-5 border border-[#252b23] shadow-xs space-y-4">
        {/* Top row: Region tabs + View mode toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#252b23]">
          {/* Region Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs text-bone-500 font-medium mr-1 hidden md:inline">
              Região:
            </span>
            {regions.map((reg) => {
              const count =
                reg === "Todas"
                  ? cities.length
                  : cities.filter((c) => c.region === reg).length;
              const isSelected = selectedRegion === reg;

              return (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-acid text-ink-950 font-semibold"
                      : "text-bone-300 hover:text-bone-100 hover:bg-[#1c211b]"
                  }`}
                >
                  {reg} ({count})
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 self-end sm:self-auto bg-[#151a15] p-1 rounded-lg border border-[#252b23]">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-ink-700 text-acid shadow-2xs font-semibold"
                  : "text-bone-400 hover:text-bone-100"
              }`}
              title="Visualização em Cartões"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cartões</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-ink-700 text-acid shadow-2xs font-semibold"
                  : "text-bone-400 hover:text-bone-100"
              }`}
              title="Visualização em Tabela"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
        </div>

        {/* Bottom row: Inline Filter + Sort selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Friendly inline filter input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-bone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              aria-label="Filtrar municípios na tabela"
              placeholder="Filtrar por nome ou estado (ex: Curitiba, SP, CE)..."
              className="w-full pl-9 pr-8 py-2 bg-[#0f120f] text-xs sm:text-sm rounded-lg border border-[#333a2e] text-bone-100 placeholder-bone-500 focus:outline-none focus:border-acid focus:ring-1 focus:ring-acid"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-bone-500 hover:text-bone-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-bone-500 hidden sm:inline">Ordenar por:</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as SortField);
                setSortAsc(false);
              }}
              className="bg-[#0f120f] border border-[#333a2e] rounded-lg px-2.5 py-2 text-bone-200 text-xs font-medium focus:outline-none focus:border-acid"
            >
              <option value="total_expense">Maior Orçamento Total</option>
              <option value="population">Maior População</option>
              <option value="health_per_capita">Mais Investe em Saúde / hab</option>
              <option value="education_per_capita">Mais Investe em Educação / hab</option>
              <option value="students_public_total">Mais Alunos na Rede Pública</option>
              <option value="education_personnel_percentage">
                Maior Peso do Pessoal na Educação
              </option>
              <option value="own_revenue_percentage">Maior Autonomia (menos repasses)</option>
              <option value="personnel_expense_percentage_rcl">Folha Salarial (% RCL)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 rounded-lg bg-[#151a15] border border-[#333a2e] text-bone-300 hover:text-bone-100"
              title={sortAsc ? "Ordem Crescente" : "Ordem Decrescente"}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-bone-400 px-1 font-mono">
        <span>
          {loading
            ? "Carregando municípios..."
            : `Mostrando ${visibleCities.length} de ${filteredCities.length} municípios${
                filteredCities.length !== cities.length ? ` (filtro de ${cities.length})` : ""
              }`}
        </span>
        {filterQuery && (
          <span>Filtro ativo: &quot;{filterQuery}&quot;</span>
        )}
      </div>

      {/* LOADING SKELETON */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-ink-850 rounded-xl p-5 border border-[#252b23] animate-pulse space-y-4"
            >
              <div className="h-4 w-2/3 bg-[#252b23] rounded" />
              <div className="h-3 w-1/2 bg-[#151a15] rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-[#151a15] rounded-lg" />
                <div className="h-12 bg-[#151a15] rounded-lg" />
              </div>
              <div className="h-8 bg-[#151a15] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === "cards" && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleCities.map((city, idx) => {
            const lrf = getLRFStatus(city.personnel_expense_percentage_rcl);
            const totalPerCapita = Math.round(city.total_expense / city.population);

            return (
              <div
                key={city.ibge_code}
                className="bg-ink-850 rounded-xl p-5 border border-[#252b23] shadow-xs hover:border-acid/60 transition-colors flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#252b23]">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif font-bold text-lg text-bone-100 group-hover:text-bone-50">
                          {city.city_name}
                        </span>
                        <span className="text-xs font-mono text-bone-400 font-semibold">
                          {city.uf}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#151a15] text-bone-300 font-medium font-sans">
                          {city.region}
                        </span>
                        {city.fiscal_year !== referenceYear && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#151a15] text-bone-300 border border-[#252b23] font-medium font-sans"
                            title="Exercício mais recente com relatório de fechamento publicado"
                          >
                            {city.fiscal_year}
                          </span>
                        )}
                        {city.data_source === "synthetic" && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/30 font-medium font-sans"
                            title="Município sem relatório publicado no SICONFI; números estimados"
                          >
                            estimativa
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-bone-400 mt-0.5 flex items-center gap-1 font-mono">
                        <Users className="w-3 h-3 text-bone-500" />
                        <span>{formatNumber(city.population)} moradores</span>
                        <span className="text-ink-400">•</span>
                        <span>{city.tier}</span>
                      </div>
                    </div>

                    {city.personnel_expense_percentage_rcl > 0 ? (
                      <span
                        className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded text-right whitespace-nowrap"
                        style={{
                          color: lrf.color,
                          backgroundColor: lrf.bgLight ? undefined : "#252b23",
                        }}
                      >
                        {lrf.label}
                      </span>
                    ) : (
                      <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded text-right whitespace-nowrap bg-ink-700 text-bone-300">
                        sem RGF
                      </span>
                    )}
                  </div>

                  {/* Core Numbers */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-[#0f120f] rounded-lg border border-[#252b23]">
                      <span className="text-bone-500 block text-[11px]">Orçamento Total</span>
                      <span className="font-mono font-bold text-bone-100 text-sm">
                        {formatBRL(city.total_expense, true)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#0f120f] rounded-lg border border-[#252b23]">
                      <span className="text-bone-500 block text-[11px]">Total / Morador</span>
                      <span className="font-mono font-bold text-bone-100 text-sm">
                        {formatBRL(totalPerCapita)} <span className="text-[10px] text-bone-500 font-sans">/ano</span>
                      </span>
                    </div>
                  </div>

                  {/* Sector Spending Matrix per resident */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-[#252b23] text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-bone-300 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-[#8ce99a]" />
                        Saúde por morador:
                      </span>
                      <span className="font-mono font-bold text-[#8ce99a]">
                        {formatBRL(city.health_per_capita)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-bone-300 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#f5c451]" />
                        Educação por morador:
                      </span>
                      <span className="font-mono font-bold text-[#f5c451]">
                        {formatBRL(city.education_per_capita)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-bone-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-bone-500" />
                        Gasto com Pessoal (LRF):
                      </span>
                      <span
                        className="font-mono font-semibold"
                        style={{
                          color:
                            city.personnel_expense_percentage_rcl > 0
                              ? lrf.color
                              : "#a5a794",
                        }}
                      >
                        {formatPersonnelPct(city.personnel_expense_percentage_rcl)}
                      </span>
                    </div>

                    {/* Autonomy Bar */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-bone-500 font-mono mb-1">
                        <span>Autonomia: {formatPct(city.own_revenue_percentage)}</span>
                        <span>Repasses: {formatPct(city.transfers_revenue_percentage)}</span>
                      </div>
                      <div className="w-full bg-[#252b23] h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-acid h-full"
                          style={{ width: `${city.own_revenue_percentage}%` }}
                          title={`Receita Própria: ${city.own_revenue_percentage}%`}
                        />
                        <div
                          className="bg-[#333a2e] h-full"
                          style={{ width: `${city.transfers_revenue_percentage}%` }}
                          title={`Repasses: ${city.transfers_revenue_percentage}%`}
                        />
                      </div>
                    </div>

                    {/* Education indicators */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 bg-[#0f120f] rounded-lg border border-[#252b23]">
                        <span className="text-bone-500 block text-[10px] leading-tight">
                          Alunos (rede pública)
                        </span>
                        <span className="font-mono font-bold text-bone-100 text-xs">
                          {typeof city.students_public_total === "number"
                            ? formatNumber(city.students_public_total)
                            : "n/d"}
                        </span>
                      </div>
                      <div className="p-2 bg-[#0f120f] rounded-lg border border-[#252b23]">
                        <span className="text-bone-500 block text-[10px] leading-tight">
                          Pessoal na Educação
                        </span>
                        <span className="font-mono font-bold text-bone-100 text-xs">
                          {typeof city.education_personnel_percentage === "number"
                            ? formatPct(city.education_personnel_percentage)
                            : "n/d"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="mt-5 pt-3 border-t border-[#252b23]">
                  <Link
                    href={`/cidade/${city.ibge_code}/`}
                    className="block text-center text-xs font-semibold py-2 px-3 border border-ink-600 text-bone-200 transition-colors hover:border-acid hover:text-acid"
                  >
                    Examinar Raio-X Completo
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && !loading && (
        <div className="bg-ink-850 rounded-xl border border-[#252b23] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs sm:text-sm">
              <thead className="bg-ink-800 text-bone-400 font-semibold border-b border-[#252b23]">
                <tr>
                  <th scope="col" className="py-3 px-4 font-mono text-[10px] uppercase tracking-label">Município</th>
                  {renderSortHeader("population", "População")}
                  {renderSortHeader("total_expense", "Orçamento Anual")}
                  {renderSortHeader("health_per_capita", "Saúde / hab")}
                  {renderSortHeader("education_per_capita", "Educação / hab")}
                  {renderSortHeader("students_public_total", "Alunos (público)")}
                  {renderSortHeader("education_personnel_percentage", "Pessoal na Educação")}
                  {renderSortHeader("own_revenue_percentage", "Autonomia")}
                  {renderSortHeader("personnel_expense_percentage_rcl", "Folha (LRF)")}
                  <th scope="col" className="py-3 px-4 font-mono text-[10px] uppercase tracking-label text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252b23]">
                {visibleCities.map((city) => {
                  const lrf = getLRFStatus(city.personnel_expense_percentage_rcl);

                  return (
                    <tr key={city.ibge_code} className="hover:bg-ink-800 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/cidade/${city.ibge_code}/`} className="font-semibold text-bone-100 hover:text-acid hover:underline block whitespace-nowrap">
                          {city.city_name} ({city.uf})
                        </Link>
                        <span className="text-[11px] text-bone-500 font-mono">
                          {city.region} • IBGE: {city.ibge_code}
                          {city.fiscal_year !== referenceYear
                            ? ` • dados de ${city.fiscal_year}`
                            : ""}
                          {city.data_source === "synthetic" ? " • estimativa" : ""}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {formatNumber(city.population)}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-bone-100">
                        {formatBRL(city.total_expense, true)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#8ce99a] font-semibold">
                        {formatBRL(city.health_per_capita)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#f5c451] font-semibold">
                        {formatBRL(city.education_per_capita)}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {typeof city.students_public_total === "number"
                          ? formatNumber(city.students_public_total)
                          : "n/d"}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {typeof city.education_personnel_percentage === "number"
                          ? formatPct(city.education_personnel_percentage)
                          : "n/d"}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {formatPct(city.own_revenue_percentage)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="font-mono font-semibold block"
                          style={{
                            color:
                              city.personnel_expense_percentage_rcl > 0
                                ? lrf.color
                                : "#a5a794",
                          }}
                        >
                          {formatPersonnelPct(city.personnel_expense_percentage_rcl)}
                        </span>
                        <span className="text-[10px] text-bone-500 block font-sans">
                          {city.personnel_expense_percentage_rcl > 0
                            ? lrf.label
                            : "sem RGF"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/cidade/${city.ibge_code}/`}
                          className="px-2.5 py-1 border border-ink-600 text-bone-200 hover:border-acid hover:text-acid text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          Ver Raio-X
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOAD MORE */}
      {!loading && remaining > 0 && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + pageSize)}
            className="px-4 py-2 border border-[#333a2e] bg-ink-850 text-xs font-semibold text-bone-100 hover:border-acid hover:text-acid transition-colors"
          >
            Carregar mais municípios
          </button>
          <span className="text-[11px] text-bone-500 font-mono">
            {remaining} restantes
          </span>
        </div>
      )}
    </div>
  );
}
