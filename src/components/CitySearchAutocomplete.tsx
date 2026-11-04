"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CityIndexItem } from "@/lib/types";
import { formatNumber, formatBRL } from "@/lib/civicDictionary";
import { publicDataPath } from "@/lib/paths";
import { searchCities } from "@/lib/search";

interface Props {
  initialCities?: CityIndexItem[];
  placeholder?: string;
  autoFocus?: boolean;
  /** Hides the example chips, for compact headers. */
  showExamples?: boolean;
}

export default function CitySearchAutocomplete({
  initialCities = [],
  placeholder = "Digite o nome da cidade ou UF (ex: Guarulhos, Sobral, SP, Curitiba)...",
  autoFocus = false,
  showExamples = true,
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

  // Baixa o índice em segundo plano logo que a página carrega: a primeira
  // letra digitada já encontra resultados em vez de esperar 1 MB de JSON.
  useEffect(() => {
    const timer = setTimeout(loadIndex, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca tolerante: ignora acentos, aceita palavras fora de ordem e pequenos
  // erros de digitação ("marica" → Maricá, "guaruljos" → Guarulhos).
  const displayList = useMemo(
    () => searchCities(cities, query, 8),
    [cities, query]
  );
  const hasQuery = query.trim().length > 0;

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
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-bone-500 pointer-events-none">
          <Search className="w-5 h-5 text-bone-500" />
        </div>
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="city-search-results"
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && displayList[highlightIdx]
              ? `city-option-${displayList[highlightIdx].ibge_code}`
              : undefined
          }
          aria-label="Buscar município por nome, sigla do estado ou código IBGE"
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
          className="w-full pl-12 pr-12 py-3.5 bg-ink-850 text-bone-100 rounded-lg border border-[#333a2e] shadow-xs hover:border-ink-500 focus:border-acid focus:outline-none focus:ring-1 focus:ring-acid text-sm sm:text-base font-sans transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-4 text-xs text-bone-400 hover:text-bone-100"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id="city-search-results"
          role="listbox"
          aria-label="Municípios encontrados"
          className="absolute top-full mt-1.5 w-full bg-ink-850 shadow-xl border border-ink-500 overflow-hidden z-50 max-h-96 overflow-y-auto"
        >
          {cities.length === 0 ? (
            <div className="p-5 text-center text-bone-400 text-sm">
              {indexLoading ? "Carregando municípios..." : "Digite para buscar um município."}
            </div>
          ) : displayList.length === 0 ? (
            <div className="p-5 text-center text-bone-400 text-sm">
              Nenhum município encontrado para &quot;{query}&quot;.
              <span className="block text-xs text-bone-500 mt-1">
                A busca ignora acentos e tolera erros de digitação. Tente só parte do nome
                (ex: &quot;guarul&quot;) ou a sigla do estado (ex: &quot;SP&quot;).
              </span>
            </div>
          ) : (
            <div className="py-1 divide-y divide-[#252b23]">
              {!hasQuery && (
                <div className="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-bone-500 bg-[#0f120f]">
                  Maiores municípios
                </div>
              )}
              {displayList.map((c, idx) => {
                const isSelected = idx === highlightIdx;
                return (
                  <button
                    key={c.ibge_code}
                    type="button"
                    role="option"
                    id={`city-option-${c.ibge_code}`}
                    aria-selected={isSelected}
                    onClick={() => handleSelectCity(c.ibge_code)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                      isSelected
                        ? "bg-[#1a2019] text-acid"
                        : "hover:bg-ink-800 text-bone-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-bone-100 text-sm sm:text-base">
                          {c.city_name}
                        </span>
                        <span className="text-xs font-mono font-medium text-bone-400">
                          {c.uf}
                        </span>
                        <span className="text-xs text-bone-500 font-mono">
                          (IBGE: {c.ibge_code})
                        </span>
                      </div>
                      <div className="text-xs text-bone-400 mt-0.5 font-sans">
                        <span>{formatNumber(c.population)} habitantes</span>
                        <span className="mx-1.5 text-ink-400">|</span>
                        <span>Orçamento total: {formatBRL(c.total_expense, true)}</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono uppercase tracking-label text-bone-500">
                      Ver dados →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Benchmark Cities */}
      {showExamples && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-bone-400">
          <span className="font-mono text-[10px] uppercase tracking-label text-bone-500">Exemplos</span>
          {sampleChips.map((chip) => (
            <button
              key={chip.code}
              type="button"
              onClick={() => handleSelectCity(chip.code)}
              className="px-2.5 py-1 border border-ink-600 text-bone-300 transition-colors hover:border-acid hover:text-acid font-mono text-[10px] uppercase tracking-label"
            >
              {chip.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
