import Link from "next/link";
import { getLocalBrazilSummary } from "@/lib/dataService";
import { formatBRL, formatNumber, formatPct } from "@/lib/civicDictionary";
import NationalDataExplorer from "@/components/NationalDataExplorer";
import {
  Wallet,
  Users,
  HeartPulse,
  GraduationCap,
  Building,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Database,
  Layers,
} from "lucide-react";

export default function HomePage() {
  const allCities = getLocalBrazilSummary();

  // Aggregate stats across the current monitored dataset
  const totalExpense = allCities.reduce((acc, c) => acc + c.total_expense, 0);
  const totalRevenue = allCities.reduce((acc, c) => acc + c.total_revenue, 0);
  const totalPopulation = allCities.reduce((acc, c) => acc + c.population, 0);
  const totalHealth = allCities.reduce((acc, c) => acc + c.health_per_capita * c.population, 0);
  const totalEducation = allCities.reduce((acc, c) => acc + c.education_per_capita * c.population, 0);

  const avgHealthPerCapita = Math.round(totalHealth / totalPopulation);
  const avgEducationPerCapita = Math.round(totalEducation / totalPopulation);
  const overallPersonnelPct = (
    allCities.reduce((acc, c) => acc + c.personnel_expense_percentage_rcl, 0) /
    allCities.length
  ).toFixed(1);

  // Benchmarks / Curiosities for quick discovery
  const highestHealthCity = [...allCities].sort(
    (a, b) => b.health_per_capita - a.health_per_capita
  )[0];

  const highestEduCity = [...allCities].sort(
    (a, b) => b.education_per_capita - a.education_per_capita
  )[0];

  const highestBudgetCity = [...allCities].sort(
    (a, b) => b.total_expense - a.total_expense
  )[0];

  const lowestPersonnelCity = [...allCities].sort(
    (a, b) => a.personnel_expense_percentage_rcl - b.personnel_expense_percentage_rcl
  )[0];

  return (
    <div className="space-y-12 pb-20">
      {/* Politicômetro-style Official Timestamp Banner */}
      <div className="bg-[#ede7dd]/80 border-b border-[#e2ddd3] py-2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1c5a38] animate-pulse" />
            <span>Dados Oficiais Tesouro Nacional (SICONFI) • Exercício Fiscal 2025</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            {allCities.length} municípios monitorados • Atualização mensal
          </div>
        </div>
      </div>

      {/* Main Intro + Aggregated National Overview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Observatório Fiscal das Cidades Brasileiras
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-civic-ink tracking-tight">
            Para onde vai o dinheiro público municipal?
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed font-sans">
            Veja abaixo o raio-x das contas públicas consolidado dos municípios brasileiros.
            Sem barreiras ou termos contábeis complicados, você já vê os números agregados de saúde,
            educação e folha de pagamento por habitante.
          </p>
        </div>

        {/* Aggregated Numbers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Total Budget */}
          <div className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs space-y-1">
            <div className="text-slate-400 text-xs flex items-center gap-1 font-medium">
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              <span>Orçamento Executado</span>
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-civic-ink font-mono">
              {formatBRL(totalExpense, true)}
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Receita: <span className="font-mono text-slate-700">{formatBRL(totalRevenue, true)}</span>
            </p>
          </div>

          {/* Card 2: Population */}
          <div className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs space-y-1">
            <div className="text-slate-400 text-xs flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Cidadãos Atendidos</span>
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-civic-ink font-mono">
              {formatNumber(totalPopulation)}
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              População oficial Censo IBGE
            </p>
          </div>

          {/* Card 3: Health / Hab */}
          <div className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs space-y-1">
            <div className="text-slate-400 text-xs flex items-center gap-1 font-medium">
              <HeartPulse className="w-3.5 h-3.5 text-[#1c5a38]" />
              <span>Média em Saúde</span>
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1c5a38] font-mono">
              {formatBRL(avgHealthPerCapita)}
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Por habitante ao ano (SUS local)
            </p>
          </div>

          {/* Card 4: Education / Hab */}
          <div className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs space-y-1">
            <div className="text-slate-400 text-xs flex items-center gap-1 font-medium">
              <GraduationCap className="w-3.5 h-3.5 text-[#1e3a5f]" />
              <span>Média em Educação</span>
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1e3a5f] font-mono">
              {formatBRL(avgEducationPerCapita)}
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Por habitante ao ano (Creches/Fund.)
            </p>
          </div>
        </div>
      </section>

      {/* Discoveries & Spotlights Section (Politicômetro Curiosity Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-[#f6f3ee] border border-[#e5e0d8] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#e2ddd3] pb-3">
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                Destaques do Orçamento
              </span>
              <h2 className="font-serif text-xl font-bold text-civic-ink">
                O que os dados revelam sobre as cidades brasileiras?
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Diferenças marcantes entre municípios
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Spotlight 1: Health Leader */}
            <Link
              href={`/cidade/${highestHealthCity.ibge_code}/`}
              className="bg-white p-4 rounded-lg border border-[#e5e0d8] hover:border-slate-400 transition-colors space-y-1.5 block group"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-medium text-[#1c5a38]">Mais investe em Saúde / hab</span>
                <span className="font-mono">{highestHealthCity.uf}</span>
              </div>
              <div className="font-serif font-bold text-base text-civic-ink group-hover:underline">
                {highestHealthCity.city_name}
              </div>
              <div className="text-lg font-bold font-mono text-[#1c5a38]">
                {formatBRL(highestHealthCity.health_per_capita)} <span className="text-xs text-slate-500 font-normal font-sans">/ano</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Receita impulsionada por royalties do petróleo permite investimento diferenciado no SUS.
              </p>
            </Link>

            {/* Spotlight 2: Education Benchmark */}
            <Link
              href={`/cidade/${highestEduCity.ibge_code}/`}
              className="bg-white p-4 rounded-lg border border-[#e5e0d8] hover:border-slate-400 transition-colors space-y-1.5 block group"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-medium text-[#1e3a5f]">Destaque em Educação / hab</span>
                <span className="font-mono">{highestEduCity.uf}</span>
              </div>
              <div className="font-serif font-bold text-base text-civic-ink group-hover:underline">
                {highestEduCity.city_name}
              </div>
              <div className="text-lg font-bold font-mono text-[#1e3a5f]">
                {formatBRL(highestEduCity.education_per_capita)} <span className="text-xs text-slate-500 font-normal font-sans">/ano</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Referência nacional no IDEB: forte foco em creches e alfabetização infantil.
              </p>
            </Link>

            {/* Spotlight 3: Biggest Budget */}
            <Link
              href={`/cidade/${highestBudgetCity.ibge_code}/`}
              className="bg-white p-4 rounded-lg border border-[#e5e0d8] hover:border-slate-400 transition-colors space-y-1.5 block group"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-medium text-slate-700">Maior Orçamento Nacional</span>
                <span className="font-mono">{highestBudgetCity.uf}</span>
              </div>
              <div className="font-serif font-bold text-base text-civic-ink group-hover:underline">
                {highestBudgetCity.city_name}
              </div>
              <div className="text-lg font-bold font-mono text-civic-ink">
                {formatBRL(highestBudgetCity.total_expense, true)}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Orçamento anual da metrópole supera o de estados inteiros do Brasil.
              </p>
            </Link>

            {/* Spotlight 4: Leanest Payroll LRF */}
            <Link
              href={`/cidade/${lowestPersonnelCity.ibge_code}/`}
              className="bg-white p-4 rounded-lg border border-[#e5e0d8] hover:border-slate-400 transition-colors space-y-1.5 block group"
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-medium text-[#1c5a38]">Menor % Folha (LRF)</span>
                <span className="font-mono">{lowestPersonnelCity.uf}</span>
              </div>
              <div className="font-serif font-bold text-base text-civic-ink group-hover:underline">
                {lowestPersonnelCity.city_name}
              </div>
              <div className="text-lg font-bold font-mono text-[#1c5a38]">
                {formatPct(lowestPersonnelCity.personnel_expense_percentage_rcl)}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Folha de pagamento bem distante do teto de alerta (48,6%) e máximo (54%).
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Interactive Data Explorer */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-civic-ink">
            Explorador Geral das Cidades
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Filtre por região, ordene por qualquer métrica ou busque pelo nome da cidade
          </p>
        </div>

        <NationalDataExplorer />
      </section>

      {/* Side-by-Side Compare CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-[#132238] text-white rounded-xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-mono text-[#ede7dd]/70 uppercase tracking-wider">
              Análise Comparativa
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#fbfaf8]">
              Quer comparar municípios lado a lado?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Coloque até 3 cidades no painel comparador para avaliar prioridades orçamentárias,
              disparidades per capita e conformidade com a Lei de Responsabilidade Fiscal.
            </p>
          </div>

          <Link
            href="/comparar/"
            className="px-5 py-3 rounded bg-white text-civic-ink hover:bg-[#ede7dd] font-sans font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap text-center"
          >
            Abrir Comparador Lado a Lado
          </Link>
        </div>
      </section>

      {/* Plain Language & Architecture Details */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Civic Dictionary Box */}
          <div className="bg-white rounded-xl p-6 border border-[#e5e0d8] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-civic-ink">
                Dicionário Cidadão
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Não sabe o que é <em>Dotação Atualizada</em> ou <em>Restos a Pagar</em>?
              Criamos uma tabela de equivalência que traduz termos contábeis técnicos para linguagem simples e acessível.
            </p>
            <div className="pt-2">
              <Link
                href="/dicionario/"
                className="text-xs font-semibold text-civic-ink hover:underline inline-flex items-center gap-1"
              >
                <span>Consultar o dicionário completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Jamstack & Zero-Cost Architecture */}
          <div className="bg-white rounded-xl p-6 border border-[#e5e0d8] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-civic-ink">
                Arquitetura Jamstack Zero-Cost
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              O Cofre Público é 100% estático e open-source. Os dados são pré-computados
              mensalmente por um pipeline Python e servidos via Cloudflare Pages / Vercel com custo zero de infraestrutura e tráfego ilimitado.
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                JSON por município + Parquet consolidado + Next.js SSG
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
