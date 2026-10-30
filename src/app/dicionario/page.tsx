import { CIVIC_DICTIONARY } from "@/lib/civicDictionary";

export const metadata = {
  title: "Dicionário do Orçamento Cidadão | Tradução Contábil",
  description:
    "Aprenda o significado prático de termos contábeis do poder público sem jargões complicados.",
};

export default function DicionarioPage() {
  const termsList = Object.entries(CIVIC_DICTIONARY);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="space-y-3 pb-6 border-b border-[#e7e2d9]">
        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          Transparência &amp; Educação Fiscal
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-civic-ink tracking-tight">
          Dicionário do Orçamento Cidadão
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans max-w-2xl">
          A contabilidade pública foi historicamente escrita para técnicos. Este guia traduz o jargão
          oficial para o vocabulário da sua casa, permitindo que qualquer cidadão fiscalize as contas da sua cidade.
        </p>
      </div>

      {/* Quick Reference Table */}
      <div className="bg-white rounded-xl p-6 border border-[#e5e0d8] shadow-xs space-y-4">
        <h2 className="font-serif text-lg font-bold text-civic-ink">
          Tabela Rápida de Equivalência
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#f6f3ee] text-slate-700 font-semibold border-b border-[#e7e2d9]">
              <tr>
                <th className="py-2.5 px-3 font-mono">Termo Oficial Técnico</th>
                <th className="py-2.5 px-3 font-semibold text-civic-ink">Tradução em Linguagem Simples</th>
                <th className="py-2.5 px-3">Conceito Prático</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede6]">
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-700">Dotação Atualizada</td>
                <td className="py-2.5 px-3 font-semibold text-civic-ink">Orçamento Planejado</td>
                <td className="py-2.5 px-3 text-slate-600">Limite máximo autorizado em lei para gastar no ano.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-700">Despesa Empenhada</td>
                <td className="py-2.5 px-3 font-semibold text-civic-ink">Gasto Reservado / Contratado</td>
                <td className="py-2.5 px-3 text-slate-600">Dinheiro separado para honrar um contrato assinado.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-700">Despesa Liquidada / Paga</td>
                <td className="py-2.5 px-3 font-semibold text-civic-ink">Gasto Efetivamente Pago</td>
                <td className="py-2.5 px-3 text-slate-600">Serviço vistoriado, nota fiscal atestada e dinheiro transferido.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-700">Restos a Pagar</td>
                <td className="py-2.5 px-3 font-semibold text-civic-ink">Contas de Anos Anteriores</td>
                <td className="py-2.5 px-3 text-slate-600">Contas do ano anterior que rolaram para este exercício.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-700">Receita Corrente Líquida (RCL)</td>
                <td className="py-2.5 px-3 font-semibold text-civic-ink">Arrecadação Livre Disponível</td>
                <td className="py-2.5 px-3 text-slate-600">A régua oficial usada para medir o teto legal de salários.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Lexicon Cards */}
      <div className="space-y-6">
        <h2 className="font-serif text-xl font-bold text-civic-ink">
          Explicações Aprofundadas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {termsList.map(([key, term]) => (
            <div
              key={key}
              className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs space-y-3"
            >
              <div className="border-b border-[#f0ede6] pb-2">
                <span className="text-[11px] font-mono text-slate-400 block">
                  Termo Oficial: {term.technical}
                </span>
                <h3 className="font-serif text-lg font-bold text-civic-ink mt-0.5">
                  {term.citizen}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                {term.fullExplanation}
              </p>

              {term.practicalExample && (
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e2d9] rounded text-xs text-slate-700">
                  <span className="font-semibold block mb-0.5 text-civic-ink">Exemplo prático:</span>
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
