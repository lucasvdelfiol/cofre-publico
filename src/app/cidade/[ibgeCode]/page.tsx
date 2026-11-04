import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocalCitiesIndex, getLocalCityData } from "@/lib/dataService";
import { formatBRL, formatPct, formatNumber, getLRFStatus } from "@/lib/civicDictionary";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import FiscalHealthGauge from "@/components/FiscalHealthGauge";
import SectorSpendingChart from "@/components/SectorSpendingChart";
import HistoricalTrendChart from "@/components/HistoricalTrendChart";
import KpiCard from "@/components/KpiCard";
import PlainLanguageBadge from "@/components/PlainLanguageBadge";
import CitySearchAutocomplete from "@/components/CitySearchAutocomplete";

export async function generateStaticParams() {
  const cities = getLocalCitiesIndex();
  return cities.map((c) => ({
    ibgeCode: c.ibge_code,
  }));
}

interface Props {
  params: {
    ibgeCode: string;
  };
}

/**
 * Each of the 5.571 city pages gets its own title/description so search
 * engines and link previews show real numbers instead of the generic root
 * metadata.
 */
export function generateMetadata({ params }: Props): Metadata {
  const city = getLocalCityData(params.ibgeCode);
  if (!city) {
    return { title: "Município não encontrado" };
  }

  const { summary } = city;
  const lrf = getLRFStatus(summary.personnel_expense_percentage_rcl);
  const perCapita = Math.round(summary.total_expense / city.population);
  const title = `${city.city_name} (${city.uf}) — Gastos Públicos ${city.fiscal_year}`;
  const description =
    `Em ${city.fiscal_year}, ${city.city_name} (${city.uf}) executou ` +
    `${formatBRL(summary.total_expense, true)} em despesas, o equivalente a ` +
    `${formatBRL(perCapita)} por habitante. Gasto com pessoal: ` +
    `${formatPct(summary.personnel_expense_percentage_rcl)} da arrecadação ` +
    `líquida (RCL), na faixa ${lrf.label} da Lei de Responsabilidade Fiscal.`;

  return {
    title,
    description,
    alternates: { canonical: `/cidade/${city.ibge_code}/` },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl(`/cidade/${city.ibge_code}/`),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function periodLabel(type?: string | null, period?: number | null): string {
  if (!period) return "período publicado";
  return type === "RREO Simplificado" ? `${period}º semestre` : `${period}º bimestre`;
}


export default function CityProfilePage({ params }: Props) {
  const city = getLocalCityData(params.ibgeCode);

  if (!city) {
    notFound();
  }

  const { summary, per_capita_breakdown, historical_trend, education } = city;
  const lrf = getLRFStatus(summary.personnel_expense_percentage_rcl);

  const extraction = city.extraction;
  const isOlderYear =
    extraction?.data_year != null &&
    extraction?.requested_year != null &&
    extraction.data_year < extraction.requested_year;
  const isPartialPeriod = extraction?.rreo_complete === false;
  const personnelDerived = extraction?.personnel_source === "derived_from_rreo";
  // A few entities report no RGF at all and the RREO does not expose the RCL,
  // so the percentage is simply unknown. Showing "0,0%" would be a lie.
  const personnelKnown = summary.personnel_expense_percentage_rcl > 0;
  const isSynthetic = city.data_source === "synthetic";
  const sourceLabel = isSynthetic
    ? "Sem dados oficiais — valores estimados"
    : extraction?.personnel_source === "unavailable"
      ? "Fonte: SICONFI/Tesouro (sem RGF)"
      : extraction?.rreo_complete === false
        ? "Fonte: SICONFI/Tesouro (relatório parcial)"
        : "Fonte: SICONFI/Tesouro Nacional";
  // Estimated records must not be presented as if they respected the LRF.
  const showGauge = personnelKnown && !isSynthetic;

  const budgetBalance = summary.total_revenue - summary.total_expense;
  const isSuperavit = budgetBalance >= 0;
  const totalPerCapita = Math.round((summary.total_expense / city.population) * 10) / 10;
  const healthAndEduPerCapita = per_capita_breakdown.health + per_capita_breakdown.education;

  return (
    <div className="space-y-10 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Início",
                item: absoluteUrl("/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: `Raio-X de ${city.city_name} (${city.uf})`,
                item: absoluteUrl(`/cidade/${city.ibge_code}/`),
              },
            ],
          }),
        }}
      />
      {/* Sub-header Navigation */}
      <div className="border-b border-ink-600 bg-ink-950/70 py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-bone-500 font-mono text-[10px] uppercase tracking-label">
            <Link href="/" className="hover:text-acid hover:underline">
              Início
            </Link>
            <span>/</span>
            <span>Raio-X Municipal</span>
            <span>/</span>
            <span className="font-semibold text-acid">
              {city.city_name} ({city.uf})
            </span>
          </div>

          <div className="w-full md:w-80">
            <CitySearchAutocomplete placeholder="Mudar de cidade..." showExamples={false} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* City Masthead & Executive Summary */}
        <section className="relative overflow-hidden bg-ink-850 p-6 sm:p-8 border border-ink-600 border-l-2 border-l-acid shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-[#252b23]">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono uppercase tracking-label text-bone-500 mb-2">
                <span className="font-bold text-acid">{city.uf}</span>
                <span>·</span>
                <span>IBGE {city.ibge_code}</span>
                <span>·</span>
                <span>Exercício {city.fiscal_year}</span>
                <span>·</span>
                <span
                  className={
                    city.data_source?.startsWith("siconfi")
                      ? "text-mint font-semibold"
                      : "text-gold font-semibold"
                  }
                  title={
                    city.data_source?.startsWith("siconfi")
                      ? "Dados oficiais extraídos do SICONFI (Tesouro Nacional)"
                      : "Sem relatório SICONFI publicado; valores sintéticos"
                  }
                >
                  {sourceLabel}
                </span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-none text-bone-50 tracking-tight">
                {city.city_name}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/comparar/?cidades=${city.ibge_code}`}
                className="px-4 py-2 border border-ink-500 text-bone-200 hover:border-acid hover:text-acid font-mono text-[10px] uppercase tracking-label transition-colors"
              >
                Comparar com outras cidades
              </Link>
            </div>
          </div>

          {/* Plain-Language Executive Summary Lead Paragraph */}
          <p className="text-sm sm:text-base text-bone-200 leading-relaxed font-sans max-w-4xl">
            Em {city.fiscal_year}, o município de <strong>{city.city_name} ({city.uf})</strong> executou um orçamento total de{" "}
            <strong>{formatBRL(summary.total_expense, true)}</strong> para atender a sua população de{" "}
            <strong>{formatNumber(city.population)} habitantes</strong>, correspondendo a um investimento anual de{" "}
            <strong>{formatBRL(totalPerCapita)} por morador</strong>.{" "}
            {isSynthetic ? (
              <>
                Os números desta página são <strong>estimativas</strong> de um município que
                não publicou relatórios no SICONFI — não há como avaliar a folha de pagamento
                nem a conformidade com a Lei de Responsabilidade Fiscal.
              </>
            ) : personnelKnown ? (
              <>
                A folha salarial representou{" "}
                <strong>{formatPct(summary.personnel_expense_percentage_rcl)}</strong> da
                Arrecadação Livre (RCL), classificada na faixa{" "}
                <strong style={{ color: lrf.color }}>{lrf.label}</strong> da Lei de
                Responsabilidade Fiscal.
              </>
            ) : (
              <>
                O município não enviou o RGF com o gasto de pessoal, então esse indicador não
                está disponível.
              </>
            )}
          </p>

          {city.data_source === "synthetic" && (
            <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-xs leading-relaxed text-bone-100">
              <strong className="block mb-1">
                Este município ainda não publicou os relatórios de 2025 no SICONFI
              </strong>
              Os valores desta página são <strong>estimativas</strong> calculadas a partir da
              população e de médias de municípios de porte semelhante. Eles servem para manter a
              navegação completa, mas <strong>não devem ser citados como dado oficial</strong>.
              Consulte o portal da prefeitura ou o{" "}
              <a
                href="https://siconfi.tesouro.gov.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                SICONFI
              </a>{" "}
              para os números definitivos.
            </div>
          )}

          {isOlderYear && (
            <div className="rounded-lg border border-[#333a2e] bg-[#0f120f] p-4 text-xs leading-relaxed text-bone-300">
              <strong className="block mb-1 text-bone-100">
                Último exercício completo disponível: {city.fiscal_year}
              </strong>
              {city.city_name} ainda não publicou o relatório de fechamento de{" "}
              {extraction?.requested_year} no SICONFI. Para não exibir números inventados,
              mostramos os dados oficiais de {city.fiscal_year}, o exercício mais recente com
              relatório completo.
            </div>
          )}

          {isPartialPeriod && (
            <div className="rounded-lg border border-[#333a2e] bg-[#0f120f] p-4 text-xs leading-relaxed text-bone-300">
              <strong className="block mb-1 text-bone-100">
                Relatório parcial: dados acumulados até o{" "}
                {periodLabel(extraction?.rreo_type, extraction?.rreo_period)} de{" "}
                {city.fiscal_year}
              </strong>
              O município ainda não enviou o relatório de fechamento do ano ao SICONFI. Os
              totais abaixo cobrem apenas o período publicado, então não devem ser comparados
              diretamente com o ano cheio de outras cidades.
            </div>
          )}

          {personnelDerived && (
            <div className="rounded-lg border border-[#333a2e] bg-[#0f120f] p-4 text-xs leading-relaxed text-bone-300">
              <strong className="block mb-1 text-bone-100">
                Gasto com pessoal calculado de forma complementar
              </strong>
              O RGF deste município não estava disponível no SICONFI no momento da coleta. O
              percentual de pessoal foi calculado a partir das receitas declaradas no próprio
              RREO (Anexo 03), e não do RGF Anexo 01. Os demais valores são oficiais.
            </div>
          )}
        </section>

        {/* Top-Level KPI Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Despesa Efetiva"
            citizenTitle="Gasto Realmente Pago"
            technicalTermKey="despesa_liquidada"
            value={formatBRL(summary.total_expense, true)}
            secondaryValue={formatBRL(summary.total_revenue, true)}
            secondaryLabel="Arrecadação Total"
            badge={
              <span
                className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: isSuperavit ? "#16281a" : "#2c1512",
                  color: isSuperavit ? "#8ce99a" : "#ff8f78",
                }}
              >
                {isSuperavit ? "Superávit" : "Déficit"}
              </span>
            }
          >
            <div className="text-[11px] text-bone-400 flex justify-between font-mono">
              <span>Balanço final:</span>
              <span className={isSuperavit ? "text-[#8ce99a] font-bold" : "text-[#ff8f78] font-bold"}>
                {isSuperavit ? "+" : ""}
                {formatBRL(budgetBalance, true)}
              </span>
            </div>
          </KpiCard>

          <KpiCard
            title="Autonomia Financeira"
            citizenTitle="Arrecadação Própria vs. Repasses"
            technicalTermKey="autonomia_fiscal"
            value={formatPct(summary.own_revenue_percentage)}
            secondaryValue={formatPct(summary.transfers_revenue_percentage)}
            secondaryLabel="Dependência Repasses"
          >
            <div className="mt-1 flex h-2 w-full overflow-hidden bg-[#252b23]">
              <div
                className="h-full bg-acid"
                style={{ width: `${summary.own_revenue_percentage}%` }}
                title={`Arrecadação Própria: ${summary.own_revenue_percentage}%`}
              />
              <div
                className="h-full bg-[#333a2e]"
                style={{ width: `${summary.transfers_revenue_percentage}%` }}
                title={`Repasses Externos: ${summary.transfers_revenue_percentage}%`}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-bone-400">
              <span>Receita própria: {formatPct(summary.own_revenue_percentage)}</span>
              <span>Repasses: {formatPct(summary.transfers_revenue_percentage)}</span>
            </div>
          </KpiCard>

          <KpiCard
            title="Gasto por Morador"
            citizenTitle="Média Anual por Habitante"
            value={formatBRL(totalPerCapita)}
            secondaryValue={formatBRL(healthAndEduPerCapita)}
            secondaryLabel="Saúde + Educação"
          >
            <div className="text-[11px] text-bone-400 font-mono">
              Equivale a {formatBRL(totalPerCapita / 12)} / mês por cidadão.
            </div>
          </KpiCard>

          <KpiCard
            title="Folha de Pagamento"
            citizenTitle="Gasto com Pessoal (% RCL)"
            technicalTermKey="receita_corrente_liquida"
            value={
              personnelKnown
                ? formatPct(summary.personnel_expense_percentage_rcl)
                : "n/d"
            }
            secondaryValue="54,0%"
            secondaryLabel="Teto Máximo Legal"
            badge={
              isSynthetic ? (
                <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
                  estimativa
                </span>
              ) : personnelKnown ? (
                <span
                  className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded"
                  style={{ color: lrf.color, backgroundColor: lrf.bgLight ? undefined : "#252b23" }}
                >
                  {lrf.label}
                </span>
              ) : (
                <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded bg-ink-700 text-bone-300">
                  sem RGF
                </span>
              )
            }
          >
            <div className="text-[11px] text-bone-400 font-sans">
              {isSynthetic ? (
                "Valor estimado — sem RGF oficial."
              ) : personnelKnown ? (
                <>
                  Status fiscal:{" "}
                  <strong style={{ color: lrf.color }}>{lrf.status}</strong>
                </>
              ) : (
                "RGF não publicado no SICONFI."
              )}
            </div>
          </KpiCard>
        </section>

        {/* Education indicators: enrollment (INEP) + personnel share (SICONFI) */}
        {(education?.students || education?.personnel) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {education?.students && (
              <KpiCard
                title="Alunos na Rede Pública"
                citizenTitle="Matrículas no ensino público municipal, estadual e federal"
                value={formatNumber(education.students.public_total)}
                secondaryValue={`Censo Escolar ${education.students.year}`}
                secondaryLabel="Fonte INEP"
              >
                <div className="space-y-1.5 text-[11px] font-mono text-bone-300">
                  <div className="flex justify-between">
                    <span>Rede municipal</span>
                    <span className="font-semibold text-bone-100">
                      {formatNumber(education.students.municipal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rede estadual</span>
                    <span className="font-semibold text-bone-100">
                      {formatNumber(education.students.estadual)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rede federal</span>
                    <span className="font-semibold text-bone-100">
                      {formatNumber(education.students.federal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#252b23] pt-1.5 text-bone-400">
                    <span>Rede privada (referência)</span>
                    <span className="font-semibold">
                      {formatNumber(education.students.private)}
                    </span>
                  </div>
                </div>
              </KpiCard>
            )}

            {education?.personnel && (
              <KpiCard
                title="Pessoal na Educação"
                citizenTitle="Parcela da despesa de Educação gasta com salários e encargos"
                value={formatPct(education.personnel.percentage)}
                secondaryValue={formatBRL(education.personnel.personnel_expense, true)}
                secondaryLabel="Pessoal e encargos"
                badge={
                  <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded bg-[#151a15] text-bone-300 border border-[#252b23]">
                    {education.personnel.year}
                  </span>
                }
              >
                <div className="space-y-1.5 text-[11px] text-bone-300">
                  <div className="flex justify-between font-mono">
                    <span>Despesa empenhada em Educação</span>
                    <span className="font-semibold text-bone-100">
                      {formatBRL(education.personnel.education_expense, true)}
                    </span>
                  </div>
                  <p className="leading-relaxed text-bone-400">
                    Inclui professores e demais servidores da área. O recorte só
                    do magistério não é publicado na API do SICONFI (o RREO
                    Anexo 08 não está disponível).
                  </p>
                </div>
              </KpiCard>
            )}
          </section>
        )}

        {/* LRF Gauge & Sector Spending */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            {showGauge ? (
              <FiscalHealthGauge
                percentage={summary.personnel_expense_percentage_rcl}
              />
            ) : (
              <div className="bg-ink-850 rounded-xl p-6 border border-[#252b23] shadow-xs space-y-2">
                <h2 className="font-serif font-bold text-bone-100">
                  Termômetro da LRF indisponível
                </h2>
                <p className="text-xs text-bone-300 leading-relaxed">
                  {isSynthetic
                    ? "Sem relatório oficial no SICONFI, não é possível calcular o percentual de pessoal sobre a RCL nem avaliar os limites da Lei de Responsabilidade Fiscal."
                    : "O município não enviou o Relatório de Gestão Fiscal (RGF) ao SICONFI, e o RREO não permite recalcular o percentual de pessoal sobre a RCL. Por isso não atribuímos nota fiscal a esta cidade."}
                </p>
              </div>
            )}

            {/* Plain-Language Civic Context Box */}
            <div className="bg-[#151a15] rounded-xl p-5 border border-[#252b23] space-y-2 text-xs text-bone-200 leading-relaxed">
              <span className="font-serif font-bold text-bone-100 text-sm block">
                Por que a LRF limita o gasto com pessoal?
              </span>
              <p>
                A Lei de Responsabilidade Fiscal impede que a totalidade dos impostos seja consumida por salários do funcionalismo.
                Se a prefeitura estoura o teto de 54%, ela fica legalmente impedida de contratar e perde o acesso a verbas da União.
              </p>
              <div className="pt-2">
                <PlainLanguageBadge
                  termKey="receita_corrente_liquida"
                  customLabel="Entenda o cálculo da Arrecadação Livre (RCL)"
                  variant="badge"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <SectorSpendingChart
              data={per_capita_breakdown}
              population={city.population}
            />
          </div>
        </section>

        {/* Historical Trend */}
        <section>
          <HistoricalTrendChart
            trend={historical_trend}
            cityName={city.city_name}
          />
        </section>
      </div>
    </div>
  );
}
