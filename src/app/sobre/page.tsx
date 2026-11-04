import type { Metadata } from "next";
import Link from "next/link";
import { getLocalExtractionMetadata } from "@/lib/dataService";
import { publicDataPath } from "@/lib/paths";
import { Database, ShieldCheck, TriangleAlert, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Metodologia e Fontes dos Dados",
  description:
    "De onde vêm os números do Cofre Público: SICONFI (RREO, RGF e DCA), IBGE, como cada indicador é calculado e quais são as limitações dos dados.",
  alternates: { canonical: "/sobre/" },
};

const SOURCES = [
  {
    name: "RREO — Anexo 01 e Anexo 02",
    org: "SICONFI / Tesouro Nacional",
    what: "Balanço orçamentário (receitas, despesas empenhadas e transferências) e gasto por função (saúde, educação, urbanismo…).",
  },
  {
    name: "RGF — Anexo 01",
    org: "SICONFI / Tesouro Nacional",
    what: "Despesa total com pessoal e o percentual oficial sobre a Receita Corrente Líquida Ajustada (RCL).",
  },
  {
    name: "DCA — Anexo I-E",
    org: "SICONFI / Tesouro Nacional",
    what: "Série histórica de despesa por função de 2021 até o ano anterior ao exercício atual.",
  },
  {
    name: "Censo Demográfico 2022",
    org: "IBGE (Agregado 4714)",
    what: "População residente usada em todos os indicadores por habitante.",
  },
  {
    name: "Censo Escolar — microdados",
    org: "INEP / MEC",
    what: "Matrículas da Educação Básica por município e dependência administrativa (federal, estadual, municipal e privada).",
  },
  {
    name: "MSC Orçamentária (MSCE e MSCC)",
    org: "SICONFI / Tesouro Nacional",
    what: "Execução orçamentária detalhada por função, subfunção e natureza da despesa, usada para medir o peso do pessoal na Educação. A matriz mensal (MSCC) cobre os entes que não detalham a execução na matriz de encerramento.",
  },
];

const METHOD = [
  {
    metric: "Orçamento executado",
    formula:
      "Despesas empenhadas (exceto intra-orçamentárias) acumuladas no ano, no RREO Anexo 01.",
  },
  {
    metric: "Arrecadação própria e repasses",
    formula:
      "Receitas menos transferências correntes e de capital, ambas do RREO Anexo 01.",
  },
  {
    metric: "Gasto por morador",
    formula: "Despesa executada dividida pela população do Censo 2022.",
  },
  {
    metric: "Folha de pagamento (% RCL)",
    formula:
      "Campo oficial “% sobre a RCL Ajustada” do RGF Anexo 01 — o mesmo que a LRF usa para os limites de 48,6% (alerta) e 54% (máximo).",
  },
  {
    metric: "Saúde e educação por habitante",
    formula:
      "Despesa empenhada nas funções 10 (Saúde) e 12 (Educação) do RREO Anexo 02, dividida pela população.",
  },
  {
    metric: "Alunos na rede pública",
    formula:
      "Soma das matrículas (QT_MAT_BAS) das escolas em atividade nas redes federal, estadual e municipal do Censo Escolar. A rede privada aparece apenas como referência.",
  },
  {
    metric: "Pessoal na Educação",
    formula:
      "Despesa empenhada na função 12 com natureza 3.1 (pessoal e encargos) dividida pelo total empenhado na função, sem as transferências intra-orçamentárias de pessoal. Inclui professores e demais servidores da educação.",
  },
];

export default function SobrePage() {
  const metadata = getLocalExtractionMetadata();
  const updatedAt = metadata?.completed_at || metadata?.generated_at;
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="space-y-3 pb-6 border-b border-[#252b23]">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-bone-500">
          <span className="h-1.5 w-1.5 bg-acid" />
          Transparência &amp; Método
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-bone-50 tracking-tight">
          De onde vêm os números
        </h1>
        <p className="text-sm sm:text-base text-bone-300 leading-relaxed font-sans max-w-2xl">
          O Cofre Público não estima nem opina: ele reorganiza relatórios que as prefeituras
          são obrigadas a enviar ao Tesouro Nacional. Esta página explica cada fonte, cada
          cálculo e o que ainda falta.
        </p>
      </div>

      {/* Sources */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-bone-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-bone-400" />
          Fontes oficiais
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOURCES.map((source) => (
            <div
              key={source.name}
              className="bg-ink-850 rounded-xl p-5 border border-[#252b23] shadow-xs space-y-1.5"
            >
              <span className="text-[11px] font-mono text-bone-500 block">
                {source.org}
              </span>
              <h3 className="font-serif font-bold text-bone-100 text-sm">
                {source.name}
              </h3>
              <p className="text-xs text-bone-300 leading-relaxed">{source.what}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-bone-400 leading-relaxed">
          Os dados brutos são baixados da API pública do SICONFI
          (<span className="font-mono">apidatalake.tesouro.gov.br/ords/siconfi</span>), do
          portal de dados do IBGE e dos microdados do Censo Escolar do INEP. Nenhum valor é
          ajustado, suavizado ou interpolado.
        </p>
      </section>

      {/* Method table */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-bone-100">
          Como cada indicador é calculado
        </h2>
        <div className="bg-ink-850 rounded-xl border border-[#252b23] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#151a15] text-bone-200 font-semibold border-b border-[#252b23]">
                <tr>
                  <th className="py-2.5 px-3 font-sans whitespace-nowrap">Indicador</th>
                  <th className="py-2.5 px-3 font-sans">Cálculo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252b23]">
                {METHOD.map((row) => (
                  <tr key={row.metric}>
                    <td className="py-2.5 px-3 font-semibold text-bone-100 align-top">
                      {row.metric}
                    </td>
                    <td className="py-2.5 px-3 text-bone-300 leading-relaxed">
                      {row.formula}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-bone-100 flex items-center gap-2">
          <TriangleAlert className="w-4 h-4 text-gold" />
          O que os dados não dizem
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-bone-300 leading-relaxed">
          <div className="p-4 bg-ink-850 rounded-xl border border-[#252b23] shadow-xs">
            <strong className="block text-bone-100 mb-1">
              Pessoal da Educação não é só magistério
            </strong>
            A API do SICONFI não publica o recorte exclusivo de professores: o RREO
            Anexo 08 (Manutenção e Desenvolvimento do Ensino) não está disponível e o SIOPE
            exige autenticação. Por isso o indicador mostra todo o pessoal e encargos da
            função Educação, não apenas o magistério.
          </div>

          <div className="p-4 bg-ink-850 rounded-xl border border-[#252b23] shadow-xs">
            <strong className="block text-bone-100 mb-1">
              Empenhado não é pago
            </strong>
            O RREO mostra despesas <em>empenhadas</em>: o valor foi reservado para um contrato
            ou compra. Parte pode ser paga só no ano seguinte, como restos a pagar.
          </div>

          <div className="p-4 bg-gold/10 rounded-xl border border-gold/30 text-bone-100">
            <strong className="block mb-1">
              Municípios sem relatório publicado
            </strong>
            {metadata ? (
              <>
                Dos {metadata.municipalities.toLocaleString("pt-BR")} municípios,{" "}
                {metadata.synthetic_records.toLocaleString("pt-BR")} não tinham RREO/RGF
                disponíveis no SICONFI no momento da coleta. Esses casos aparecem marcados como{" "}
                <strong>estimativa</strong> e não devem ser citados como dado oficial.
                {metadata.synthetic_cities && metadata.synthetic_cities.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold underline">
                      Ver a lista dos {metadata.synthetic_cities.length} municípios
                    </summary>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                      {metadata.synthetic_cities.map((city) => (
                        <li key={city.ibge_code}>
                          {city.city_name} ({city.uf})
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <>
                Municípios sem RREO/RGF no SICONFI aparecem marcados como{" "}
                <strong>estimativa</strong> e não devem ser citados como dado oficial.
              </>
            )}
          </div>

          <div className="p-4 bg-ink-850 rounded-xl border border-[#252b23] shadow-xs">
            <strong className="block text-bone-100 mb-1">
              Relatórios parciais e de anos anteriores
            </strong>
            Quando o relatório de fechamento ainda não foi enviado, a página mostra o
            acumulado até o último bimestre publicado ou, se não houver nada no ano, o último
            exercício completo disponível. O aviso no topo de cada cidade indica qual caso se
            aplica.
          </div>

          <div className="p-4 bg-ink-850 rounded-xl border border-[#252b23] shadow-xs">
            <strong className="block text-bone-100 mb-1">
              Percentuais de pessoal acima de 100% da RCL
            </strong>
            Alguns municípios declaram no RGF um gasto com pessoal maior que toda a receita
            corrente líquida. O valor é reproduzido como enviado, mas quase sempre indica erro
            de preenchimento — e a página deixa esse aviso explícito.
          </div>
        </div>
      </section>

      {/* Update cadence + downloads */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#151a15] rounded-xl p-6 border border-[#252b23] space-y-2">
          <h2 className="font-serif font-bold text-bone-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-bone-400" />
            Atualização
          </h2>
          <p className="text-xs sm:text-sm text-bone-300 leading-relaxed">
            A coleta roda mensalmente a partir da API do SICONFI e os arquivos do site são
            regerados por completo. O site em si é estático e publicado no GitHub Pages.
          </p>
          <p className="text-[11px] font-mono text-bone-400">
            {updatedLabel ? `Última coleta: ${updatedLabel}` : "Última coleta: não informada"}
            {metadata ? ` • exercício de referência ${metadata.target_year}` : ""}
          </p>
        </div>

        <div className="bg-ink-850 rounded-xl p-6 border border-[#252b23] shadow-xs space-y-2">
          <h2 className="font-serif font-bold text-bone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8ce99a]" />
            Baixe e reutilize
          </h2>
          <p className="text-xs sm:text-sm text-bone-300 leading-relaxed">
            Todos os dados do site estão disponíveis em formato aberto, sem cadastro:
          </p>
          <ul className="text-xs space-y-1.5 font-mono">
            <li>
              <a
                className="text-bone-100 underline hover:no-underline"
                href={publicDataPath("brazil_summary.parquet")}
              >
                brazil_summary.parquet
              </a>{" "}
              <span className="text-bone-500 font-sans">(dataset analítico)</span>
            </li>
            <li>
              <a
                className="text-bone-100 underline hover:no-underline"
                href={publicDataPath("brazil_summary.json")}
              >
                brazil_summary.json
              </a>{" "}
              <span className="text-bone-500 font-sans">(mesmos dados em JSON)</span>
            </li>
            <li>
              <a
                className="text-bone-100 underline hover:no-underline"
                href={publicDataPath("cities_index.json")}
              >
                cities_index.json
              </a>{" "}
              <span className="text-bone-500 font-sans">(índice de busca)</span>
            </li>
          </ul>
          <p className="text-[11px] text-bone-400 pt-1">
            O pipeline e o código do site estão no{" "}
            <a
              className="underline hover:no-underline"
              href="https://github.com/lucasvdelfiol/cofre-publico"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </section>

      <p className="text-xs text-bone-400 leading-relaxed">
        Encontrou um número estranho? Compare com o relatório original no{" "}
        <a
          className="underline hover:no-underline"
          href="https://siconfi.tesouro.gov.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          SICONFI
        </a>{" "}
        e, se for um problema nosso, abra uma issue no repositório. Dados públicos só viram
        controle social quando alguém confere.
      </p>

      <div className="pt-2">
        <Link
          href="/"
          className="text-xs font-semibold text-bone-100 hover:underline"
        >
          ← Voltar para a busca de municípios
        </Link>
      </div>
    </div>
  );
}
