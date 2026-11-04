import Link from "next/link";
import { getLocalBrazilSummary, getLocalExtractionMetadata } from "@/lib/dataService";
import { formatBRL, formatNumber, formatPct } from "@/lib/civicDictionary";
import NationalDataExplorer from "@/components/NationalDataExplorer";
import CitySearchAutocomplete from "@/components/CitySearchAutocomplete";
import { Wallet, Users, HeartPulse, GraduationCap, ArrowRight } from "lucide-react";

export default function HomePage() {
  const allCities = getLocalBrazilSummary();
  const metadata = getLocalExtractionMetadata();
  const officialCities =
    metadata != null
      ? metadata.real_records
      : allCities.filter((city) => city.data_source?.startsWith("siconfi")).length;
  const updatedAt = metadata?.completed_at || metadata?.generated_at;
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  // Aggregate stats across the current monitored dataset
  const totalExpense = allCities.reduce((acc, c) => acc + c.total_expense, 0);
  const totalRevenue = allCities.reduce((acc, c) => acc + c.total_revenue, 0);
  const totalPopulation = allCities.reduce((acc, c) => acc + c.population, 0);
  const totalHealth = allCities.reduce((acc, c) => acc + c.health_per_capita * c.population, 0);
  const totalEducation = allCities.reduce((acc, c) => acc + c.education_per_capita * c.population, 0);

  const avgHealthPerCapita = Math.round(totalHealth / totalPopulation);
  const avgEducationPerCapita = Math.round(totalEducation / totalPopulation);

  // Education indicators: enrollment counts add up across municipalities;
  // the personnel share is weighted by each city's education spending so a
  // tiny city does not weigh as much as a capital.
  const totalStudents = allCities.reduce(
    (acc, c) => acc + (c.students_public_total ?? 0),
    0
  );
  const educationExpense = allCities.reduce(
    (acc, c) => acc + (c.education_expense ?? 0),
    0
  );
  const educationPersonnel = allCities.reduce(
    (acc, c) => acc + (c.education_personnel_expense ?? 0),
    0
  );
  const educationPersonnelShare =
    educationExpense > 0 ? (educationPersonnel / educationExpense) * 100 : null;
  const studentsYear = metadata?.education?.students_year ?? null;
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

  // Entities without an RGF report 0, which is unknown rather than "lean".
  const lowestPersonnelCity = [...allCities]
    .filter((city) => city.personnel_expense_percentage_rcl > 0)
    .sort(
      (a, b) => a.personnel_expense_percentage_rcl - b.personnel_expense_percentage_rcl
    )[0];

  // Context for the spotlight cards: how far each record is from the national
  // picture, so the copy states facts instead of guesses.
  const healthVsAverage = avgHealthPerCapita
    ? highestHealthCity.health_per_capita / avgHealthPerCapita
    : 0;
  const eduVsAverage = avgEducationPerCapita
    ? highestEduCity.education_per_capita / avgEducationPerCapita
    : 0;
  const budgetShare = totalExpense
    ? (highestBudgetCity.total_expense / totalExpense) * 100
    : 0;
  const personnelGap =
    48.6 - (lowestPersonnelCity?.personnel_expense_percentage_rcl ?? 0);

  return (
    <div className="space-y-16 pb-24">
      {/* Official timestamp strip */}
      <div className="border-b border-ink-600 bg-ink-950/80">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-1 px-4 py-2 font-mono text-[10px] uppercase tracking-label text-bone-500 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-acid" />
            <span>Dados oficiais Tesouro Nacional (SICONFI) · Exercício 2025</span>
          </div>
          <div>
            {officialCities.toLocaleString("pt-BR")} de{" "}
            {allCities.length.toLocaleString("pt-BR")} municípios com dados oficiais
            {updatedLabel ? ` · Atualizado em ${updatedLabel}` : ""}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
          <div className="space-y-5 lg:col-span-8">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span className="h-2 w-2 bg-acid" />
              01 / Observatório fiscal das cidades brasileiras
            </div>
            <h1 className="max-w-4xl font-serif text-4xl font-bold leading-[0.98] tracking-tight text-bone-50 sm:text-5xl md:text-6xl">
              Para onde vai o{" "}
              <span className="text-acid">dinheiro público</span> municipal?
            </h1>
            <p className="max-w-2xl border-l border-ink-500 pl-4 text-sm leading-relaxed text-bone-300 sm:text-base">
              O raio-x das contas públicas de todos os municípios brasileiros, em números
              agregados de saúde, educação e folha de pagamento por habitante.
              Sem jargão, sem estimativa disfarçada de dado oficial.
            </p>
            <p className="font-mono text-[11px] text-bone-500">
              <Link href="/sobre/" className="underline decoration-ink-500 underline-offset-4 hover:text-acid hover:decoration-acid">
                De onde vêm os números e como cada indicador é calculado →
              </Link>
            </p>
          </div>

          <div className="lg:col-span-4">
            <div className="border border-ink-600 bg-ink-850 p-4">
              <div className="font-mono text-[10px] uppercase tracking-label text-bone-500">
                Cobertura da base
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="font-mono text-3xl font-semibold leading-none text-bone-50">
                  {officialCities.toLocaleString("pt-BR")}
                </span>
                <span className="text-right font-mono text-[10px] leading-tight text-bone-500">
                  municípios
                  <br />
                  com relatório oficial
                </span>
              </div>
              <div className="mt-4 h-1 w-full bg-ink-700">
                <div
                  className="h-full bg-acid"
                  style={{ width: `${(officialCities / allCities.length) * 100}%` }}
                />
              </div>
              <p className="mt-3 font-mono text-[10px] text-bone-500">
                {allCities.length.toLocaleString("pt-BR")} na base ·{" "}
                {metadata?.synthetic_records ?? 0} estimativas identificadas
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-10 border-y border-ink-600 bg-ink-850/60 px-4 py-7 sm:px-6">
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-bone-500">
            <span className="h-1.5 w-1.5 bg-acid" />
            Consulte um município
          </div>
          <CitySearchAutocomplete />
        </div>
      </section>

      {/* Aggregated numbers: one data sheet, cells divided by hairlines */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-bone-50">
            O país em quatro números
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-label text-bone-500">
            02 / Panorama
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px border border-ink-600 bg-ink-600 lg:grid-cols-4">
          {/* 01 Budget */}
          <div className="bg-ink-850 p-5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span>01 · Orçamento</span>
              <Wallet className="h-3.5 w-3.5 text-bone-500" />
            </div>
            <div className="mt-5 font-mono text-xl font-semibold leading-none tracking-tight text-bone-50 sm:text-2xl">
              {formatBRL(totalExpense, true)}
            </div>
            <p className="mt-2 text-[11px] text-bone-500">
              Receita: <span className="font-mono text-bone-300">{formatBRL(totalRevenue, true)}</span>
            </p>
          </div>

          {/* 02 Population */}
          <div className="bg-ink-850 p-5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span>02 · População</span>
              <Users className="h-3.5 w-3.5 text-bone-500" />
            </div>
            <div className="mt-5 font-mono text-xl font-semibold leading-none tracking-tight text-bone-50 sm:text-2xl">
              {formatNumber(totalPopulation)}
            </div>
            <p className="mt-2 text-[11px] text-bone-500">Censo IBGE 2022</p>
          </div>

          {/* 03 Health */}
          <div className="bg-ink-850 p-5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span>03 · Saúde</span>
              <HeartPulse className="h-3.5 w-3.5 text-mint" />
            </div>
            <div className="mt-5 font-mono text-xl font-semibold leading-none tracking-tight text-mint sm:text-2xl">
              {formatBRL(avgHealthPerCapita)}
            </div>
            <p className="mt-2 text-[11px] text-bone-500">Por habitante / ano · SUS local</p>
          </div>

          {/* 04 Education */}
          <div className="bg-ink-850 p-5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span>04 · Educação</span>
              <GraduationCap className="h-3.5 w-3.5 text-gold" />
            </div>
            <div className="mt-5 font-mono text-xl font-semibold leading-none tracking-tight text-gold sm:text-2xl">
              {formatBRL(avgEducationPerCapita)}
            </div>
            <p className="mt-2 text-[11px] text-bone-500">Por habitante / ano</p>
          </div>
        </div>

        {/* Education indicators */}
        {(totalStudents > 0 || educationPersonnelShare !== null) && (
          <div className="mt-4 grid grid-cols-1 gap-px border border-ink-600 bg-ink-600 sm:grid-cols-2">
            <div className="bg-ink-850 p-5">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
                <span>05 · Alunos na rede pública</span>
                <GraduationCap className="h-3.5 w-3.5 text-gold" />
              </div>
              <div className="mt-5 font-mono text-xl font-semibold leading-none tracking-tight text-gold sm:text-2xl">
                {formatNumber(totalStudents)}
              </div>
              <p className="mt-2 text-[11px] text-bone-500">
                Matrículas municipais, estaduais e federais
                {studentsYear ? ` · Censo Escolar ${studentsYear}` : ""}
              </p>
            </div>

            {educationPersonnelShare !== null && (
              <div className="bg-ink-850 p-5">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
                  <span>06 · Pessoal na Educação</span>
                  <Wallet className="h-3.5 w-3.5 text-bone-500" />
                </div>
                <div className="mt-5 font-mono text-xl font-semibold leading-none tracking-tight text-bone-50 sm:text-2xl">
                  {formatPct(educationPersonnelShare)}
                </div>
                <p className="mt-2 text-[11px] text-bone-500">
                  Da despesa municipal de Educação com salários e encargos
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Spotlights */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-label text-acid">03</span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-bone-50">
              O que os dados revelam
            </h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-label text-bone-500">
            Extremos do orçamento municipal
          </span>
        </div>

        <div className="grid grid-cols-1 gap-px border border-ink-600 bg-ink-600 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/cidade/${highestHealthCity.ibge_code}/`}
            className="group bg-ink-850 p-5 transition-colors hover:bg-ink-800"
          >
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label">
              <span className="text-mint">Mais saúde / habitante</span>
              <span className="text-bone-500">{highestHealthCity.uf}</span>
            </div>
            <div className="mt-5 font-serif text-lg font-bold text-bone-50 group-hover:text-acid">
              {highestHealthCity.city_name}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-mint">
              {formatBRL(highestHealthCity.health_per_capita)}
              <span className="ml-1 font-sans text-[10px] font-normal text-bone-500">/ano</span>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-bone-500">
              {healthVsAverage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× a média
              nacional por habitante (R$ {avgHealthPerCapita.toLocaleString("pt-BR")}).
            </p>
          </Link>

          <Link
            href={`/cidade/${highestEduCity.ibge_code}/`}
            className="group bg-ink-850 p-5 transition-colors hover:bg-ink-800"
          >
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label">
              <span className="text-gold">Mais educação / habitante</span>
              <span className="text-bone-500">{highestEduCity.uf}</span>
            </div>
            <div className="mt-5 font-serif text-lg font-bold text-bone-50 group-hover:text-acid">
              {highestEduCity.city_name}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-gold">
              {formatBRL(highestEduCity.education_per_capita)}
              <span className="ml-1 font-sans text-[10px] font-normal text-bone-500">/ano</span>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-bone-500">
              {eduVsAverage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× a média
              nacional por habitante (R$ {avgEducationPerCapita.toLocaleString("pt-BR")}).
            </p>
          </Link>

          <Link
            href={`/cidade/${highestBudgetCity.ibge_code}/`}
            className="group bg-ink-850 p-5 transition-colors hover:bg-ink-800"
          >
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label">
              <span className="text-bone-300">Maior orçamento</span>
              <span className="text-bone-500">{highestBudgetCity.uf}</span>
            </div>
            <div className="mt-5 font-serif text-lg font-bold text-bone-50 group-hover:text-acid">
              {highestBudgetCity.city_name}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-bone-50">
              {formatBRL(highestBudgetCity.total_expense, true)}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-bone-500">
              Concentra {budgetShare.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de
              todo o gasto municipal do país.
            </p>
          </Link>

          <Link
            href={`/cidade/${lowestPersonnelCity.ibge_code}/`}
            className="group bg-ink-850 p-5 transition-colors hover:bg-ink-800"
          >
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label">
              <span className="text-acid">Menor % folha (LRF)</span>
              <span className="text-bone-500">{lowestPersonnelCity.uf}</span>
            </div>
            <div className="mt-5 font-serif text-lg font-bold text-bone-50 group-hover:text-acid">
              {lowestPersonnelCity.city_name}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-acid">
              {formatPct(lowestPersonnelCity.personnel_expense_percentage_rcl)}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-bone-500">
              {personnelGap.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pontos
              percentuais abaixo do teto de alerta da LRF (48,6%).
            </p>
          </Link>
        </div>
      </section>

      {/* Explorer */}
      <section className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-label text-acid">04</span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-bone-50">
              Explorador geral das cidades
            </h2>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-label text-bone-500">
            Filtre · ordene · compare
          </p>
        </div>

        <NationalDataExplorer referenceYear={metadata?.target_year ?? 2025} />
      </section>

      {/* Compare CTA — the single large acid surface on the page */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden bg-acid p-8 text-ink-950 sm:p-10">
          <span className="absolute right-6 top-6 font-mono text-[10px] uppercase tracking-label text-ink-800/60">
            05 / Comparador
          </span>
          <div className="flex max-w-3xl flex-col gap-6">
            <div className="space-y-3">
              <h3 className="max-w-xl font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Quer comparar municípios lado a lado?
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-ink-800">
                Coloque até 3 cidades no painel comparador para avaliar prioridades
                orçamentárias, disparidades per capita e conformidade com a Lei de
                Responsabilidade Fiscal.
              </p>
            </div>
            <Link
              href="/comparar/"
              className="inline-flex w-fit items-center gap-2 border border-ink-950 bg-ink-950 px-5 py-3 font-mono text-[11px] uppercase tracking-label text-acid transition-colors hover:bg-ink-800"
            >
              Abrir comparador
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Method + dictionary */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-px border border-ink-600 bg-ink-600 md:grid-cols-2">
          <div className="bg-ink-850 p-6">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span>06 · Dicionário</span>
              <span>Linguagem cidadã</span>
            </div>
            <h3 className="mt-5 font-serif text-xl font-bold text-bone-50">Dicionário Cidadão</h3>
            <p className="mt-2 text-xs leading-relaxed text-bone-300 sm:text-sm">
              Não sabe o que é <em>Dotação Atualizada</em> ou <em>Restos a Pagar</em>?
              Uma tabela de equivalência traduz termos contábeis para o vocabulário do dia a dia.
            </p>
            <Link
              href="/dicionario/"
              className="mt-5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-label text-acid hover:underline"
            >
              Consultar o dicionário
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-ink-850 p-6">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bone-500">
              <span>07 · Arquitetura</span>
              <span>Zero-cost</span>
            </div>
            <h3 className="mt-5 font-serif text-xl font-bold text-bone-50">Jamstack aberto</h3>
            <p className="mt-2 text-xs leading-relaxed text-bone-300 sm:text-sm">
              O Cofre Público é 100% estático e open-source. Os dados são pré-computados
              mensalmente por um pipeline Python e publicados no GitHub Pages, sem banco de
              dados, servidor de aplicação ou custo de infraestrutura.
            </p>
            <span className="mt-5 block font-mono text-[10px] uppercase tracking-label text-bone-500">
              JSON · Parquet · Next.js SSG
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
