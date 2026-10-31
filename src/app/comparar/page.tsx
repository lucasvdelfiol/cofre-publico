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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ede7dd] text-civic-ink text-xs font-mono font-semibold border border-[#d8d2c6]">
          <GitCompare className="w-3.5 h-3.5" />
          <span>Análise Comparativa Per Capita</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-civic-ink tracking-tight">
          Comparador Lado a Lado
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
          Selecione 2 a 3 municípios para analisar disparidades orçamentárias, prioridades de investimento social e saúde fiscal da folha de pagamento.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-[#e5e0d8]">
            Carregando painel comparador...
          </div>
        }
      >
        <CityComparator />
      </Suspense>
    </div>
  );
}
