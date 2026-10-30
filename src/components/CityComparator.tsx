"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CityData, CityIndexItem } from "@/lib/types";
import { formatBRL, formatPct, formatNumber, getLRFStatus } from "@/lib/civicDictionary";
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

  useEffect(() => {
    fetch("/data/cities_index.json")
      .then((res) => res.json())
      .then((data: CityIndexItem[]) => setAllCities(data))
      .catch((err) => console.error("Error loading cities index:", err));
  }, []);

  useEffect(() => {
    async function loadSelected() {
      setLoading(true);
      try {
        const promises = selectedCodes.map(async (code) => {
          const res = await fetch(`/data/cities/${code}.json`);
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
      alert("Você pode comparar até 3 municípios simultaneamente.");
      return;
    }
    setSelectedCodes([...selectedCodes, code]);
    setAddingCode("");
  };

  const handleRemoveCity = (code: string) => {
    if (selectedCodes.length <= 1) {
      alert("Mantenha ao menos um município no comparador.");
      return;
    }
    setSelectedCodes(selectedCodes.filter((c) => c !== code));
  };

  const cityBarColors = ["bg-[#0c1829]", "bg-[#1c5a38]", "bg-[#1e3a5f]"];

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
      format: (v: number) => formatPct(v),
      max: 60,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Selector Toolbar */}
      <div className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-lg text-civic-ink">
            Comparação Lado a Lado
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analise disparidades fiscais e prioridades setoriais entre municípios
          </p>
        </div>

        {selectedCodes.length < 3 && (
          <div className="flex items-center gap-2">
            <select
              value={addingCode}
              onChange={(e) => setAddingCode(e.target.value)}
              className="text-xs sm:text-sm bg-[#fbfaf8] border border-[#d8d2c6] rounded px-3 py-2 text-slate-700 focus:outline-none focus:border-civic-ink"
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
              className="inline-flex items-center gap-1 px-3 py-2 rounded bg-civic-ink text-white font-sans text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-[#e5e0d8] text-sm">
          Carregando dados comparativos...
        </div>
      ) : (
        <>
          {/* Municipality Cards */}
          <div className={`grid grid-cols-1 md:grid-cols-${cityDataList.length} gap-5`}>
            {cityDataList.map((city, idx) => {
              const lrf = getLRFStatus(city.summary.personnel_expense_percentage_rcl);

              return (
                <div
                  key={city.ibge_code}
                  className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-[#f0ede6]">
                      <div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Município {idx + 1}
                        </span>
                        <h3 className="font-serif text-2xl font-bold text-civic-ink mt-0.5">
                          {city.city_name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {city.uf} • IBGE {city.ibge_code}
                        </p>
                      </div>

                      {selectedCodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCity(city.ibge_code)}
                          className="p-1 text-slate-400 hover:text-red-700"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">População:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatNumber(city.population)} hab.
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Orçamento Anual:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatBRL(city.summary.total_expense, true)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gasto Pessoal (LRF):</span>
                        <span
                          className="font-mono font-semibold"
                          style={{ color: lrf.color }}
                        >
                          {formatPct(city.summary.personnel_expense_percentage_rcl)} ({lrf.label})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#f0ede6]">
                    <Link
                      href={`/cidade/${city.ibge_code}/`}
                      className="block text-center text-xs font-semibold py-2 rounded bg-[#f6f3ee] hover:bg-[#ede7dd] text-civic-ink transition-colors"
                    >
                      Abrir Raio-X de {city.city_name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grouped Comparative Metrics */}
          <div className="bg-white rounded-xl p-6 border border-[#e5e0d8] shadow-xs space-y-6">
            <div className="border-b border-[#f0ede6] pb-3">
              <h3 className="font-serif font-bold text-civic-ink text-base">
                Métricas Per Capita Lado a Lado
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Barras proporcionais calculadas em relação ao maior valor do grupo
              </p>
            </div>

            <div className="space-y-6">
              {comparisonMetrics.map((metric) => (
                <div key={metric.label} className="space-y-2 p-3.5 bg-[#fbfaf8] rounded border border-[#f0ede6]">
                  <div>
                    <span className="font-semibold text-civic-ink text-xs sm:text-sm">
                      {metric.label}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
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
                            <span className="font-medium text-slate-700">
                              {city.city_name} ({city.uf})
                            </span>
                            <span className="font-mono font-bold text-civic-ink">
                              {metric.format(val)}
                            </span>
                          </div>
                          <div className="w-full bg-[#ede7dd] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barBg}`}
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
