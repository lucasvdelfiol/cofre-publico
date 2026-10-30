"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CityIndexItem } from "@/lib/types";
import { formatNumber, formatBRL } from "@/lib/civicDictionary";
import { publicDataPath } from "@/lib/paths";

interface Props {
  initialCities?: CityIndexItem[];
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CitySearchAutocomplete({
  initialCities = [],
  placeholder = "Digite o nome da cidade ou UF (ex: Guarulhos, Sobral, SP, Curitiba)...",
  autoFocus = false,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CityIndexItem[]>(initialCities);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [indexLoading, setIndexLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRequested = useRef(initialCities.length > 0);

  // The index is ~1 MB, so it is only downloaded once the user actually
  // interacts with the search box instead of on every page view.
  const loadIndex = () => {
    if (indexRequested.current) return;
    indexRequested.current = true;
    setIndexLoading(true);
    fetch(publicDataPath("cities_index.json"))
      .then((res) => res.json())
      .then((data: CityIndexItem[]) => setCities(data))
      .catch((err) => {
        indexRequested.current = false;
        console.error("Error loading cities index:", err);
      })
      .finally(() => setIndexLoading(false));
  };

  useEffect(() => {
    // Keeps the initial list in sync when a parent passes cities later.
    if (initialCities.length > 0 && cities.length === 0) {
      setCities(initialCities);
    }
  }, [initialCities, cities.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanQuery = query.trim().toLowerCase();
  const filtered = cities.filter((c) => {
    if (!cleanQuery) return true;
    const nameMatch = c.city_name.toLowerCase().includes(cleanQuery);
    const ufMatch = c.uf.toLowerCase() === cleanQuery;
    const codeMatch = c.ibge_code.includes(cleanQuery);
    return nameMatch || ufMatch || codeMatch;
  });

  const displayList = filtered.slice(0, 8);

  const handleSelectCity = (ibgeCode: string) => {
    setIsOpen(false);
    router.push(`/cidade/${ibgeCode}/`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % Math.max(displayList.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + displayList.length) % Math.max(displayList.length, 1));
    } else if (e.key === "Enter" && displayList.length > 0) {
      e.preventDefault();
      handleSelectCity(displayList[highlightIdx].ibge_code);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const sampleChips = [
    { name: "Guarulhos, SP", code: "3518800" },
    { name: "São Paulo, SP", code: "3550308" },
    { name: "Rio de Janeiro, RJ", code: "3304557" },
    { name: "Sobral, CE", code: "2312908" },
    { name: "Curitiba, PR", code: "4106902" },
    { name: "Maricá, RJ", code: "3302700" },
  ];

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400 pointer-events-none">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIdx(0);
            loadIndex();
          }}
          onFocus={() => {
            setIsOpen(true);
            loadIndex();
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 bg-white text-civic-ink rounded-lg border border-[#d8d2c6] shadow-xs hover:border-slate-400 focus:border-civic-ink focus:outline-none focus:ring-1 focus:ring-civic-ink text-sm sm:text-base font-sans transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-4 text-xs text-slate-500 hover:text-civic-ink"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 w-full bg-white rounded-lg shadow-lg border border-[#d8d2c6] overflow-hidden z-50 max-h-96 overflow-y-auto">
          {cities.length === 0 ? (
            <div className="p-5 text-center text-slate-500 text-sm">
              {indexLoading ? "Carregando municípios..." : "Digite para buscar um município."}
            </div>
          ) : displayList.length === 0 ? (
            <div className="p-5 text-center text-slate-500 text-sm">
              Nenhum município encontrado para &quot;{query}&quot;.
              <span className="block text-xs text-slate-400 mt-1">
                Tente digitar o nome da cidade ou a sigla do estado.
              </span>
            </div>
          ) : (
            <div className="py-1 divide-y divide-[#f0ede6]">
              {displayList.map((c, idx) => {
                const isSelected = idx === highlightIdx;
                return (
                  <button
                    key={c.ibge_code}
                    type="button"
                    onClick={() => handleSelectCity(c.ibge_code)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                      isSelected
                        ? "bg-[#f5f1e8] text-civic-ink"
                        : "hover:bg-[#fbfaf8] text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-civic-ink text-sm sm:text-base">
                          {c.city_name}
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-500">
                          {c.uf}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          (IBGE: {c.ibge_code})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-sans">
                        <span>{formatNumber(c.population)} habitantes</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>Orçamento total: {formatBRL(c.total_expense, true)}</span>
                      </div>
                    </div>

                    <div className="text-xs font-medium text-slate-500">
                      Ver dados
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Benchmark Cities */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-600">
        <span className="text-slate-400">Exemplos:</span>
        {sampleChips.map((chip) => (
          <button
            key={chip.code}
            type="button"
            onClick={() => handleSelectCity(chip.code)}
            className="px-2.5 py-1 rounded bg-[#ede7dd]/80 hover:bg-[#e2dacf] text-civic-ink transition-colors font-medium"
          >
            {chip.name}
          </button>
        ))}
      </div>
    </div>
  );
}
