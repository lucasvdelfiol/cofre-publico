"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CityData, CityIndexItem } from "@/lib/types";
import {
  formatBRL,
  formatPct,
  formatNumber,
  formatPersonnelPct,
  getLRFStatus,
} from "@/lib/civicDictionary";
import { publicDataPath } from "@/lib/paths";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  initialCityCodes?: string[];
}

export default function CityComparator({
  initialCityCodes = ["3518800", "3509502", "4106902"], // Guarulhos, Campinas, Curitiba
}: Props) {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get("cidades");

  const [selectedCodes, setSelectedCodes] = useState<string[]>(() => {
    if (queryParam) {
      const parsed = queryParam.split(",").filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
    return initialCityCodes;
  });

  const [cityDataList, setCityDataList] = useState<CityData[]>([]);
  const [allCities, setAllCities] = useState<CityIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCode, setAddingCode] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    fetch(publicDataPath("cities_index.json"))
      .then((res) => res.json())
      .then((data: CityIndexItem[]) => setAllCities(data))
      .catch((err) => console.error("Error loading cities index:", err));
  }, []);

  useEffect(() => {
    async function loadSelected() {
      setLoading(true);
      try {
        const promises = selectedCodes.map(async (code) => {
          const res = await fetch(publicDataPath(`cities/${code}.json`));
          if (res.ok) return (await res.json()) as CityData;
          return null;
        });
        const results = await Promise.all(promises);
        setCityDataList(results.filter((c): c is CityData => c !== null));
      } catch (e) {
        console.error("Error loading comparison cities:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSelected();
  }, [selectedCodes]);

  const handleAddCity = (code: string) => {
    if (!code || selectedCodes.includes(code)) return;
    if (selectedCodes.length >= 3) {
      setNotice("Você pode comparar até 3 municípios simultaneamente.");
      return;
    }
    setNotice("");
    setSelectedCodes([...selectedCodes, code]);
    setAddingCode("");
  };

  const handleRemoveCity = (code: string) => {
    if (selectedCodes.length <= 1) {
      setNotice("Mantenha ao menos um município no comparador.");
      return;
    }
    setNotice("");
    setSelectedCodes(selectedCodes.filter((c) => c !== code));
  };

  const cityBarColors = ["bg-[#d8f45c]", "bg-[#8ce99a]", "bg-[#f5c451]"];

  // Tailwind only generates classes it can see literally, so the column count
  // must come from a lookup instead of an interpolated class name.
  const gridCols: Record<number, string> = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
  };

  const comparisonMetrics = [
    {
      label: "Saúde Pública por Morador",
      sublabel: "Atenção Básica e postos de saúde / habitante / ano",
      getValue: (c: CityData) => c.per_capita_breakdown.health,
      format: (v: number) => formatBRL(v),
      max: Math.max(...cityDataList.map((c) => c.per_capita_breakdown.health), 2000),
    },
    {
      label: "Educação Básica por Morador",
      sublabel: "Creches e Ensino Fundamental / habitante / ano",
      getValue: (c: CityData) => c.per_capita_breakdown.education,
      format: (v: number) => formatBRL(v),
      max: Math.max(...cityDataList.map((c) => c.per_capita_breakdown.education), 2000),
    },
    {
      label: "Dependência de Repasses Externos",
      sublabel: "Percentual da receita vindo de FPM/ICMS (quanto menor, mais autônoma)",
      getValue: (c: CityData) => c.summary.transfers_revenue_percentage,
      format: (v: number) => formatPct(v),
      max: 100,
    },
    {
      label: "Gasto com Pessoal (% RCL)",
      sublabel: "Folha de pagamento sobre Arrecadação Livre (teto legal: 54%)",
      getValue: (c: CityData) => c.summary.personnel_expense_percentage_rcl,
      format: (v: number) => formatPersonnelPct(v),
      max: Math.max(
        ...cityDataList.map((c) => c.summary.personnel_expense_percentage_rcl),
        54
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Selector Toolbar */}
      <div className="bg-ink-850 rounded-xl p-5 border border-[#252b23] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-lg text-bone-100">
            Comparação Lado a Lado
          </h2>
          <p className="text-xs text-bone-400 mt-0.5">
            Analise disparidades fiscais e prioridades setoriais entre municípios
          </p>
        </div>

        {selectedCodes.length < 3 && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Escolher município para adicionar à comparação"
              value={addingCode}
              onChange={(e) => setAddingCode(e.target.value)}
              className="text-xs sm:text-sm bg-[#0f120f] border border-[#333a2e] px-3 py-2 text-bone-200 focus:outline-none focus:border-acid"
            >
              <option value="">Adicionar município...</option>
              {allCities
                .filter((c) => !selectedCodes.includes(c.ibge_code))
                .map((c) => (
                  <option key={c.ibge_code} value={c.ibge_code}>
                    {c.city_name} ({c.uf}) - {formatNumber(c.population)} hab.
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => handleAddCity(addingCode)}
              disabled={!addingCode}
              className="inline-flex items-center gap-1 px-3 py-2 bg-acid text-ink-950 font-mono text-[10px] uppercase tracking-label font-semibold hover:bg-acid-soft transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>
        )}
      </div>

      {notice && (
        <p
          role="status"
          className="text-xs text-bone-100 bg-gold/10 border border-gold/30 rounded-lg px-3 py-2"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <div className="p-12 text-center text-bone-400 bg-ink-850 rounded-xl border border-[#252b23] text-sm">
          Carregando dados comparativos...
        </div>
      ) : (
        <>
          {/* Municipality Cards */}
          <div
            className={`grid grid-cols-1 ${gridCols[cityDataList.length] ?? "md:grid-cols-3"} gap-5`}
          >
            {cityDataList.map((city, idx) => {
              const lrf = getLRFStatus(city.summary.personnel_expense_percentage_rcl);

              return (
                <div
                  key={city.ibge_code}
                  className="bg-ink-850 rounded-xl p-5 border border-[#252b23] shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-[#252b23]">
                      <div>
                        <span className="text-[11px] font-mono text-bone-500">
                          Município {idx + 1}
                        </span>
                        <h3 className="font-serif text-2xl font-bold text-bone-100 mt-0.5">
                          {city.city_name}
                        </h3>
                        <p className="text-xs text-bone-400 font-mono">
                          {city.uf} • IBGE {city.ibge_code} • Exercício {city.fiscal_year}
                        </p>
                      </div>

                      {selectedCodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCity(city.ibge_code)}
                          className="p-1 text-bone-500 hover:text-[#ff8f78]"
                          title="Remover município"
                          aria-label={`Remover ${city.city_name} da comparação`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-bone-400">População:</span>
                        <span className="font-mono font-semibold text-bone-100">
                          {formatNumber(city.population)} hab.
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bone-400">Orçamento Anual:</span>
                        <span className="font-mono font-semibold text-bone-100">
                          {formatBRL(city.summary.total_expense, true)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bone-400">Gasto Pessoal (LRF):</span>
                        <span
                          className="font-mono font-semibold"
                          style={{ color: lrf.color }}
                        >
                          {city.summary.personnel_expense_percentage_rcl > 0
                            ? `${formatPct(city.summary.personnel_expense_percentage_rcl)} (${lrf.label})`
                            : "n/d (sem RGF)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#252b23]">
                    <Link
                      href={`/cidade/${city.ibge_code}/`}
                      className="block text-center text-xs font-semibold py-2 border border-ink-600 text-bone-200 transition-colors hover:border-acid hover:text-acid"
                    >
                      Abrir Raio-X de {city.city_name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grouped Comparative Metrics */}
          <div className="bg-ink-850 rounded-xl p-6 border border-[#252b23] shadow-xs space-y-6">
            <div className="border-b border-[#252b23] pb-3">
              <h3 className="font-serif font-bold text-bone-100 text-base">
                Métricas Per Capita Lado a Lado
              </h3>
              <p className="text-xs text-bone-400 mt-0.5">
                Barras proporcionais calculadas em relação ao maior valor do grupo
              </p>
            </div>

            <div className="space-y-6">
              {comparisonMetrics.map((metric) => (
                <div key={metric.label} className="space-y-2 p-3.5 bg-[#0f120f] rounded border border-[#252b23]">
                  <div>
                    <span className="font-semibold text-bone-100 text-xs sm:text-sm">
                      {metric.label}
                    </span>
                    <span className="text-[11px] text-bone-400 block">
                      {metric.sublabel}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {cityDataList.map((city, idx) => {
                      const val = metric.getValue(city);
                      const pct = Math.min(Math.round((val / metric.max) * 100), 100);
                      const barBg = cityBarColors[idx % cityBarColors.length];

                      return (
                        <div key={city.ibge_code} className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-bone-200">
                              {city.city_name} ({city.uf})
                            </span>
                            <span className="font-mono font-bold text-bone-100">
                              {metric.format(val)}
                            </span>
                          </div>
                          <div className="w-full bg-ink-700 h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${barBg}`}
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
