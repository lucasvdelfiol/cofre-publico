import { Suspense } from "react";
import CityComparator from "@/components/CityComparator";
import { GitCompare } from "lucide-react";

export const metadata = {
  title: "Comparador de Municípios",
  description:
    "Compare gastos em saúde, educação, dependência de repasses e gasto de pessoal entre municípios brasileiros.",
};

export default function CompararPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 border border-ink-500 px-3 py-1 text-acid text-[10px] font-mono font-semibold uppercase tracking-label">
          <GitCompare className="w-3.5 h-3.5" />
          <span>Análise comparativa per capita</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-bone-50 tracking-tight">
          Comparador Lado a Lado
        </h1>
        <p className="text-sm sm:text-base text-bone-300 max-w-2xl">
          Selecione 2 a 3 municípios para analisar disparidades orçamentárias, prioridades de investimento social e saúde fiscal da folha de pagamento.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-bone-400 bg-ink-850 rounded-xl border border-[#252b23]">
            Carregando painel comparador...
          </div>
        }
      >
        <CityComparator />
      </Suspense>
    </div>
  );
}
