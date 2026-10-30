import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocalCitiesIndex, getLocalCityData } from "@/lib/dataService";
import { formatBRL, formatPct, formatNumber, getLRFStatus } from "@/lib/civicDictionary";
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

export default function CityProfilePage({ params }: Props) {
  const city = getLocalCityData(params.ibgeCode);

  if (!city) {
    notFound();
  }

  const { summary, per_capita_breakdown, historical_trend } = city;
  const lrf = getLRFStatus(summary.personnel_expense_percentage_rcl);

  const budgetBalance = summary.total_revenue - summary.total_expense;
  const isSuperavit = budgetBalance >= 0;
  const totalPerCapita = Math.round((summary.total_expense / city.population) * 10) / 10;
  const healthAndEduPerCapita = per_capita_breakdown.health + per_capita_breakdown.education;

  return (
    <div className="space-y-10 pb-20">
      {/* Sub-header Navigation */}
      <div className="bg-[#f6f3ee] border-b border-[#e7e2d9] py-3.5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-sans">
            <Link href="/" className="hover:text-civic-ink hover:underline">
              Início
            </Link>
            <span>/</span>
            <span>Raio-X Municipal</span>
            <span>/</span>
            <span className="font-semibold text-civic-ink">
              {city.city_name} ({city.uf})
            </span>
          </div>

          <div className="w-full md:w-72">
            <CitySearchAutocomplete placeholder="Mudar de cidade..." />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* City Masthead & Executive Summary */}
        <section className="bg-white rounded-xl p-6 sm:p-8 border border-[#e5e0d8] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-[#f0ede6]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
                <span className="font-bold text-civic-ink uppercase">{city.uf}</span>
                <span>•</span>
                <span>Código IBGE: {city.ibge_code}</span>
                <span>•</span>
                <span>Exercício Fiscal: {city.fiscal_year}</span>
                <span>•</span>
                <span
                  className={
                    city.data_source?.startsWith("siconfi")
                      ? "text-[#1c5a38] font-semibold"
                      : "text-amber-700 font-semibold"
                  }
                  title={
                    city.data_source?.startsWith("siconfi")
                      ? "Dados oficiais extraídos do SICONFI (Tesouro Nacional)"
                      : "Sem relatório SICONFI publicado; valores sintéticos"
                  }
                >
                  {city.data_source?.startsWith("siconfi")
                    ? "Fonte: SICONFI/Tesouro Nacional"
                    : "Dados sintéticos"}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-civic-ink tracking-tight">
                {city.city_name}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/comparar/?cidades=${city.ibge_code}`}
                className="px-4 py-2 rounded bg-[#ede7dd] hover:bg-[#e2dacf] text-civic-ink font-sans font-semibold text-xs transition-colors"
              >
                Comparar {city.city_name} com outras cidades
              </Link>
            </div>
          </div>

          {/* Plain-Language Executive Summary Lead Paragraph */}
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-sans max-w-4xl">
            Em {city.fiscal_year}, o município de <strong>{city.city_name} ({city.uf})</strong> executou um orçamento total de{" "}
            <strong>{formatBRL(summary.total_expense, true)}</strong> para atender a sua população de{" "}
            <strong>{formatNumber(city.population)} habitantes</strong>, correspondendo a um investimento anual de{" "}
            <strong>{formatBRL(totalPerCapita)} por morador</strong>. A folha salarial representou{" "}
            <strong>{formatPct(summary.personnel_expense_percentage_rcl)}</strong> da Arrecadação Livre (RCL), classificada na faixa{" "}
            <strong style={{ color: lrf.color }}>{lrf.label}</strong> da Lei de Responsabilidade Fiscal.
          </p>
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
                  backgroundColor: isSuperavit ? "#e9f5ee" : "#fee2e2",
                  color: isSuperavit ? "#1c5a38" : "#991b1b",
                }}
              >
                {isSuperavit ? "Superávit" : "Déficit"}
              </span>
            }
          >
            <div className="text-[11px] text-slate-500 flex justify-between font-mono">
              <span>Balanço final:</span>
              <span className={isSuperavit ? "text-[#1c5a38] font-bold" : "text-[#991b1b] font-bold"}>
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
            <div className="w-full bg-[#f0ede6] h-2 rounded-full overflow-hidden flex mt-1">
              <div
                className="bg-[#1e3a5f] h-full"
                style={{ width: `${summary.own_revenue_percentage}%` }}
                title={`Arrecadação Própria: ${summary.own_revenue_percentage}%`}
              />
              <div
                className="bg-[#ded4c3] h-full"
                style={{ width: `${summary.transfers_revenue_percentage}%` }}
                title={`Repasses Externos: ${summary.transfers_revenue_percentage}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
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
            <div className="text-[11px] text-slate-500 font-mono">
              Equivale a {formatBRL(totalPerCapita / 12)} / mês por cidadão.
            </div>
          </KpiCard>

          <KpiCard
            title="Folha de Pagamento"
            citizenTitle="Gasto com Pessoal (% RCL)"
            technicalTermKey="receita_corrente_liquida"
            value={formatPct(summary.personnel_expense_percentage_rcl)}
            secondaryValue="54,0%"
            secondaryLabel="Teto Máximo Legal"
            badge={
              <span
                className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded"
                style={{ color: lrf.color, backgroundColor: lrf.bgLight ? undefined : "#f3f4f6" }}
              >
                {lrf.label}
              </span>
            }
          >
            <div className="text-[11px] text-slate-500 font-sans">
              Status fiscal: <strong style={{ color: lrf.color }}>{lrf.status}</strong>
            </div>
          </KpiCard>
        </section>

        {/* LRF Gauge & Sector Spending */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <FiscalHealthGauge
              percentage={summary.personnel_expense_percentage_rcl}
            />

            {/* Plain-Language Civic Context Box */}
            <div className="bg-[#f6f3ee] rounded-xl p-5 border border-[#e5e0d8] space-y-2 text-xs text-slate-700 leading-relaxed">
              <span className="font-serif font-bold text-civic-ink text-sm block">
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
