import { Suspense } from "react";
import CityComparator from "@/components/CityComparator";
import { GitCompare } from "lucide-react";

export const metadata = {
  title: "Comparador de Municípios | Cofre Público",
  description:
    "Compare gastos em saúde, educação, dependência de repasses e gasto de pessoal entre municípios brasileiros.",
};

export default function CompararPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
          <GitCompare className="w-3.5 h-3.5" />
          <span>Análise Comparativa Per Capita</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Comparador Lado a Lado
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
          Selecione 2 a 3 municípios para analisar disparidades orçamentárias, prioridades de investimento social e saúde fiscal da folha de pagamento.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Carregando painel comparador...
          </div>
        }
      >
        <CityComparator />
      </Suspense>
    </div>
  );
}
