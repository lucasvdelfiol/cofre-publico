"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BrazilSummaryItem } from "@/lib/types";
import { publicDataPath } from "@/lib/paths";
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

type SortField =
  | "population"
  | "total_expense"
  | "health_per_capita"
  | "education_per_capita"
  | "personnel_expense_percentage_rcl"
  | "own_revenue_percentage";

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

  // Filter and sort cities
  const filteredCities = useMemo(() => {
    return cities
      .filter((c) => {
        const matchesRegion =
          selectedRegion === "Todas" || c.region === selectedRegion;
        const q = filterQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          c.city_name.toLowerCase().includes(q) ||
          c.uf.toLowerCase().includes(q) ||
          c.ibge_code.includes(q);
        return matchesRegion && matchesQuery;
      })
      .sort((a, b) => {
        const factor = sortAsc ? 1 : -1;
        return (a[sortField] - b[sortField]) * factor;
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
      className="py-3 px-4 font-sans"
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-civic-ink focus:outline-none focus-visible:underline"
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
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#e5e0d8] shadow-xs space-y-4">
        {/* Top row: Region tabs + View mode toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0ede6]">
          {/* Region Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs text-slate-400 font-medium mr-1 hidden md:inline">
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
                      ? "bg-civic-ink text-white font-semibold"
                      : "text-slate-600 hover:text-civic-ink hover:bg-[#ede7dd]"
                  }`}
                >
                  {reg} ({count})
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 self-end sm:self-auto bg-[#f6f3ee] p-1 rounded-lg border border-[#e5e0d8]">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-white text-civic-ink shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-civic-ink"
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
                  ? "bg-white text-civic-ink shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-civic-ink"
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar por nome ou estado (ex: Curitiba, SP, CE)..."
              className="w-full pl-9 pr-8 py-2 bg-[#fbfaf8] text-xs sm:text-sm rounded-lg border border-[#d8d2c6] text-civic-ink placeholder-slate-400 focus:outline-none focus:border-civic-ink focus:ring-1 focus:ring-civic-ink"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden sm:inline">Ordenar por:</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as SortField);
                setSortAsc(false);
              }}
              className="bg-[#fbfaf8] border border-[#d8d2c6] rounded-lg px-2.5 py-2 text-slate-700 text-xs font-medium focus:outline-none focus:border-civic-ink"
            >
              <option value="total_expense">Maior Orçamento Total</option>
              <option value="population">Maior População</option>
              <option value="health_per_capita">Mais Investe em Saúde / hab</option>
              <option value="education_per_capita">Mais Investe em Educação / hab</option>
              <option value="own_revenue_percentage">Maior Autonomia (menos repasses)</option>
              <option value="personnel_expense_percentage_rcl">Folha Salarial (% RCL)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 rounded-lg bg-[#f6f3ee] border border-[#d8d2c6] text-slate-600 hover:text-civic-ink"
              title={sortAsc ? "Ordem Crescente" : "Ordem Decrescente"}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-mono">
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
              className="bg-white rounded-xl p-5 border border-[#e5e0d8] animate-pulse space-y-4"
            >
              <div className="h-4 w-2/3 bg-[#f0ede6] rounded" />
              <div className="h-3 w-1/2 bg-[#f6f3ee] rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-[#f6f3ee] rounded-lg" />
                <div className="h-12 bg-[#f6f3ee] rounded-lg" />
              </div>
              <div className="h-8 bg-[#f6f3ee] rounded" />
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
                className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs hover:border-slate-400 transition-colors flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#f0ede6]">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif font-bold text-lg text-civic-ink group-hover:text-slate-900">
                          {city.city_name}
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-semibold">
                          {city.uf}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f6f3ee] text-slate-600 font-medium font-sans">
                          {city.region}
                        </span>
                        {city.fiscal_year !== referenceYear && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#f6f3ee] text-slate-600 border border-[#e5e0d8] font-medium font-sans"
                            title="Exercício mais recente com relatório de fechamento publicado"
                          >
                            {city.fiscal_year}
                          </span>
                        )}
                        {city.data_source === "synthetic" && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium font-sans"
                            title="Município sem relatório publicado no SICONFI; números estimados"
                          >
                            estimativa
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{formatNumber(city.population)} moradores</span>
                        <span className="text-slate-300">•</span>
                        <span>{city.tier}</span>
                      </div>
                    </div>

                    {city.personnel_expense_percentage_rcl > 0 ? (
                      <span
                        className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded text-right whitespace-nowrap"
                        style={{
                          color: lrf.color,
                          backgroundColor: lrf.bgLight ? undefined : "#f3f4f6",
                        }}
                      >
                        {lrf.label}
                      </span>
                    ) : (
                      <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded text-right whitespace-nowrap bg-slate-100 text-slate-600">
                        sem RGF
                      </span>
                    )}
                  </div>

                  {/* Core Numbers */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-[#fbfaf8] rounded-lg border border-[#f0ede6]">
                      <span className="text-slate-400 block text-[11px]">Orçamento Total</span>
                      <span className="font-mono font-bold text-civic-ink text-sm">
                        {formatBRL(city.total_expense, true)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#fbfaf8] rounded-lg border border-[#f0ede6]">
                      <span className="text-slate-400 block text-[11px]">Total / Morador</span>
                      <span className="font-mono font-bold text-civic-ink text-sm">
                        {formatBRL(totalPerCapita)} <span className="text-[10px] text-slate-400 font-sans">/ano</span>
                      </span>
                    </div>
                  </div>

                  {/* Sector Spending Matrix per resident */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-[#f0ede6] text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-[#1c5a38]" />
                        Saúde por morador:
                      </span>
                      <span className="font-mono font-bold text-[#1c5a38]">
                        {formatBRL(city.health_per_capita)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#1e3a5f]" />
                        Educação por morador:
                      </span>
                      <span className="font-mono font-bold text-[#1e3a5f]">
                        {formatBRL(city.education_per_capita)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        Gasto com Pessoal (LRF):
                      </span>
                      <span
                        className="font-mono font-semibold"
                        style={{
                          color:
                            city.personnel_expense_percentage_rcl > 0
                              ? lrf.color
                              : "#64748b",
                        }}
                      >
                        {formatPersonnelPct(city.personnel_expense_percentage_rcl)}
                      </span>
                    </div>

                    {/* Autonomy Bar */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>Autonomia: {formatPct(city.own_revenue_percentage)}</span>
                        <span>Repasses: {formatPct(city.transfers_revenue_percentage)}</span>
                      </div>
                      <div className="w-full bg-[#f0ede6] h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-civic-ink h-full"
                          style={{ width: `${city.own_revenue_percentage}%` }}
                          title={`Receita Própria: ${city.own_revenue_percentage}%`}
                        />
                        <div
                          className="bg-[#d8d2c6] h-full"
                          style={{ width: `${city.transfers_revenue_percentage}%` }}
                          title={`Repasses: ${city.transfers_revenue_percentage}%`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="mt-5 pt-3 border-t border-[#f0ede6]">
                  <Link
                    href={`/cidade/${city.ibge_code}/`}
                    className="block text-center text-xs font-semibold py-2 px-3 rounded bg-[#f6f3ee] hover:bg-[#ede7dd] text-civic-ink transition-colors"
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
        <div className="bg-white rounded-xl border border-[#e5e0d8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#f6f3ee] text-slate-700 font-semibold border-b border-[#e5e0d8]">
                <tr>
                  <th scope="col" className="py-3 px-4 font-sans">Município</th>
                  {renderSortHeader("population", "População")}
                  {renderSortHeader("total_expense", "Orçamento Anual")}
                  {renderSortHeader("health_per_capita", "Saúde / hab")}
                  {renderSortHeader("education_per_capita", "Educação / hab")}
                  {renderSortHeader("own_revenue_percentage", "Autonomia")}
                  {renderSortHeader("personnel_expense_percentage_rcl", "Folha (LRF)")}
                  <th scope="col" className="py-3 px-4 font-sans text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede6]">
                {visibleCities.map((city) => {
                  const lrf = getLRFStatus(city.personnel_expense_percentage_rcl);

                  return (
                    <tr key={city.ibge_code} className="hover:bg-[#fbfaf8] transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/cidade/${city.ibge_code}/`} className="font-semibold text-civic-ink hover:underline block">
                          {city.city_name} ({city.uf})
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
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

                      <td className="py-3 px-4 font-mono font-semibold text-civic-ink">
                        {formatBRL(city.total_expense, true)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#1c5a38] font-semibold">
                        {formatBRL(city.health_per_capita)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#1e3a5f] font-semibold">
                        {formatBRL(city.education_per_capita)}
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
                                : "#64748b",
                          }}
                        >
                          {formatPersonnelPct(city.personnel_expense_percentage_rcl)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {city.personnel_expense_percentage_rcl > 0
                            ? lrf.label
                            : "sem RGF"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/cidade/${city.ibge_code}/`}
                          className="px-2.5 py-1 rounded bg-[#f6f3ee] hover:bg-[#ede7dd] text-civic-ink text-xs font-medium transition-colors whitespace-nowrap"
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
            className="px-4 py-2 rounded-lg border border-[#d8d2c6] bg-white text-xs font-semibold text-civic-ink hover:bg-[#f6f3ee] transition-colors"
          >
            Carregar mais municípios
          </button>
          <span className="text-[11px] text-slate-400 font-mono">
            {remaining} restantes
          </span>
        </div>
      )}
    </div>
  );
}
