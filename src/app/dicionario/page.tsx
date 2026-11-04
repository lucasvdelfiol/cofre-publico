import { CIVIC_DICTIONARY } from "@/lib/civicDictionary";

export const metadata = {
  title: "Dicionário Cidadão",
  description:
    "Aprenda o significado prático de termos contábeis do poder público sem jargões complicados.",
};

export default function DicionarioPage() {
  const termsList = Object.entries(CIVIC_DICTIONARY);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="space-y-3 pb-6 border-b border-[#252b23]">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-bone-500">
          <span className="h-1.5 w-1.5 bg-acid" />
          Transparência &amp; Educação Fiscal
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-bone-50 tracking-tight">
          Dicionário Cidadão
        </h1>
        <p className="text-sm sm:text-base text-bone-300 leading-relaxed font-sans max-w-2xl">
          A contabilidade pública foi historicamente escrita para técnicos. Este guia traduz o jargão
          oficial para o vocabulário da sua casa, permitindo que qualquer cidadão fiscalize as contas da sua cidade.
        </p>
      </div>

      {/* Quick Reference Table */}
      <div className="border border-[#252b23] bg-ink-850 p-6 shadow-xs">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-lg font-bold text-bone-100">
            Tabela Rápida de Equivalência
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-label text-bone-500">
            01 / Glossário
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs sm:text-sm">
            <thead className="border-b border-ink-500 bg-ink-800 font-semibold text-bone-400">
              <tr>
                <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-label">Termo Oficial Técnico</th>
                <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-label">Tradução em Linguagem Simples</th>
                <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-label">Conceito Prático</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252b23]">
              <tr>
                <td className="py-2.5 px-3 font-mono text-bone-200">Dotação Atualizada</td>
                <td className="py-2.5 px-3 font-semibold text-bone-100">Orçamento Planejado</td>
                <td className="py-2.5 px-3 text-bone-300">Limite máximo autorizado em lei para gastar no ano.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-bone-200">Despesa Empenhada</td>
                <td className="py-2.5 px-3 font-semibold text-bone-100">Gasto Reservado / Contratado</td>
                <td className="py-2.5 px-3 text-bone-300">Dinheiro separado para honrar um contrato assinado.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-bone-200">Despesa Liquidada / Paga</td>
                <td className="py-2.5 px-3 font-semibold text-bone-100">Gasto Efetivamente Pago</td>
                <td className="py-2.5 px-3 text-bone-300">Serviço vistoriado, nota fiscal atestada e dinheiro transferido.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-bone-200">Restos a Pagar</td>
                <td className="py-2.5 px-3 font-semibold text-bone-100">Contas de Anos Anteriores</td>
                <td className="py-2.5 px-3 text-bone-300">Contas do ano anterior que rolaram para este exercício.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-bone-200">Receita Corrente Líquida (RCL)</td>
                <td className="py-2.5 px-3 font-semibold text-bone-100">Arrecadação Livre Disponível</td>
                <td className="py-2.5 px-3 text-bone-300">A régua oficial usada para medir o teto legal de salários.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Lexicon Cards */}
      <div className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl font-bold text-bone-100">
            Explicações Aprofundadas
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-label text-bone-500">
            02 / Verbete a verbete
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {termsList.map(([key, term]) => (
            <div
              key={key}
              className="space-y-3 border border-[#252b23] bg-ink-850 p-5 shadow-xs transition-colors hover:border-ink-500"
            >
              <div className="border-b border-[#252b23] pb-2">
                <span className="block font-mono text-[10px] uppercase tracking-label text-bone-500">
                  Termo oficial: {term.technical}
                </span>
                <h3 className="mt-1 font-serif text-lg font-bold text-bone-100">
                  {term.citizen}
                </h3>
              </div>

              <p className="text-xs leading-relaxed text-bone-300 sm:text-sm">
                {term.fullExplanation}
              </p>

              {term.practicalExample && (
                <div className="border border-ink-600 bg-ink-900 p-3 text-xs text-bone-200">
                  <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-label text-acid">
                    Exemplo prático
                  </span>
                  {term.practicalExample}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
