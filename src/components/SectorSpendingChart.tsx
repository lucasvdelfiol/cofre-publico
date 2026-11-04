"use client";

import { PerCapitaBreakdown } from "@/lib/types";
import { formatBRL } from "@/lib/civicDictionary";
import PlainLanguageBadge from "./PlainLanguageBadge";

interface Props {
  data: PerCapitaBreakdown;
  population: number;
}

export default function SectorSpendingChart({ data, population }: Props) {
  const sectors = [
    {
      key: "health",
      label: "Saúde Pública",
      sublabel: "Atenção Básica, UBSs e UPAs",
      value: data.health,
      barColor: "bg-[#8ce99a]",
      constitutionalNote: "Piso mínimo legal: 15% dos impostos (LC 141/12)",
      termKey: "minimo_saude",
    },
    {
      key: "education",
      label: "Educação Básica",
      sublabel: "Creches e Ensino Fundamental",
      value: data.education,
      barColor: "bg-[#f5c451]",
      constitutionalNote: "Piso mínimo constitucional: 25% dos impostos (CF/88 Art. 212)",
      termKey: "minimo_educacao",
    },
    {
      key: "urbanism",
      label: "Urbanismo & Infraestrutura",
      sublabel: "Vias públicas, drenagem e iluminação",
      value: data.urbanism,
      barColor: "bg-[#b9a7ff]",
    },
    {
      key: "administration",
      label: "Administração Geral",
      sublabel: "Gestão municipal e planejamento",
      value: data.administration,
      barColor: "bg-[#a5a794]",
    },
    {
      key: "legislative",
      label: "Poder Legislativo",
      sublabel: "Câmara Municipal de Vereadores",
      value: data.legislative,
      barColor: "bg-[#6b6e60]",
    },
  ];

  const maxValue = Math.max(...sectors.map((s) => s.value), 1);
  const totalSectorSpend = sectors.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-ink-850 rounded-xl p-6 border border-[#252b23] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-4 border-b border-[#252b23] gap-2">
        <div>
          <h3 className="font-serif font-bold text-bone-100 text-base sm:text-lg">
            Investimento Setorial por Morador
          </h3>
          <p className="text-xs text-bone-400 mt-0.5">
            Gasto anual dividido pela população ({population.toLocaleString("pt-BR")} habitantes)
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-bone-400 block">Total setorial por morador:</span>
          <span className="text-base font-bold font-mono text-bone-100">
            {formatBRL(totalSectorSpend)} / ano
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {sectors.map((sector, idx) => {
          const pct = Math.round((sector.value / maxValue) * 100);
          const totalSpent = sector.value * population;

          return (
            <div key={sector.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs sm:text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-bone-500">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-bone-100">{sector.label}</span>
                    {sector.termKey && (
                      <PlainLanguageBadge termKey={sector.termKey} variant="icon" />
                    )}
                  </div>
                  <span className="text-[11px] text-bone-400 block">
                    {sector.sublabel}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mono text-bone-100">
                    {formatBRL(sector.value)}
                  </span>
                  <span className="text-[11px] text-bone-500 block font-mono">
                    Total: {formatBRL(totalSpent, true)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#252b23] h-1.5 overflow-hidden flex">
                <div
                  className={`h-full ${sector.barColor}`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>

              {sector.constitutionalNote && (
                <div className="text-[11px] text-bone-400 italic">
                  {sector.constitutionalNote}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
