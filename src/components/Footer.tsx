import Link from "next/link";
import { Landmark } from "lucide-react";
import { getLocalExtractionMetadata } from "@/lib/dataService";

export default function Footer() {
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
    <footer className="mt-24 border-t-2 border-acid bg-ink-950 text-bone-300">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center border border-acid/70 text-acid">
                <Landmark className="h-3.5 w-3.5" />
              </span>
              <span className="font-serif text-lg font-bold tracking-tight text-bone-50">
                Cofre Público
              </span>
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-bone-400 sm:text-sm">
              Iniciativa de controle social e transparência cívica sem fins lucrativos.
              Os dados são extraídos dos relatórios oficiais RREO e RGF enviados pelos municípios
              ao Sistema de Informações Contábeis e Fiscais do Setor Público Brasileiro (SICONFI/STN).
            </p>
            <p className="max-w-md border-l border-ink-500 pl-3 font-mono text-[11px] leading-relaxed text-bone-500">
              Arquitetura Jamstack estática, sem servidores de banco de dados ativos e custo zero de infraestrutura.
              {metadata
                ? ` ${metadata.real_records.toLocaleString("pt-BR")} municípios têm dados oficiais; ` +
                  `${metadata.synthetic_records.toLocaleString("pt-BR")} sem relatório publicado aparecem identificados como estimativa.`
                : ""}
            </p>
          </div>

          <div>
            <h3 className="mb-4 border-b border-ink-600 pb-2 font-mono text-[10px] uppercase tracking-label text-bone-500">
              Navegação
            </h3>
            <ul className="space-y-2.5 text-xs text-bone-300 sm:text-sm">
              <li>
                <Link href="/" className="transition-colors hover:text-acid">
                  Buscar Municípios
                </Link>
              </li>
              <li>
                <Link href="/comparar/" className="transition-colors hover:text-acid">
                  Comparador Lado a Lado
                </Link>
              </li>
              <li>
                <Link href="/dicionario/" className="transition-colors hover:text-acid">
                  Dicionário Orçamentário Cidadão
                </Link>
              </li>
              <li>
                <Link href="/sobre/" className="transition-colors hover:text-acid">
                  Metodologia e Fontes dos Dados
                </Link>
              </li>
              <li>
                <Link href="/cidade/3518800/" className="transition-colors hover:text-acid">
                  Raio-X: Guarulhos (SP)
                </Link>
              </li>
              <li>
                <Link href="/cidade/3550308/" className="transition-colors hover:text-acid">
                  Raio-X: São Paulo (SP)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 border-b border-ink-600 pb-2 font-mono text-[10px] uppercase tracking-label text-bone-500">
              Fontes Oficiais
            </h3>
            <ul className="space-y-2.5 text-xs text-bone-300 sm:text-sm">
              <li>
                <a
                  href="https://siconfi.tesouro.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-acid"
                >
                  SICONFI / Tesouro Nacional
                </a>
              </li>
              <li>
                <a
                  href="https://www.ibge.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-acid"
                >
                  IBGE (Censo Demográfico)
                </a>
              </li>
              <li>
                <a
                  href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-acid"
                >
                  Lei Complementar nº 101/2000 (LRF)
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/lucasvdelfiol/cofre-publico"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-acid"
                >
                  Código-fonte e pipeline (GitHub)
                </a>
              </li>
              <li className="pt-2 font-mono text-[11px] leading-relaxed text-bone-500">
                Extração mensal do SICONFI
                {updatedLabel ? ` • última coleta em ${updatedLabel}` : ""}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ink-600 pt-6 font-mono text-[10px] uppercase tracking-label text-bone-500 sm:flex-row">
          <p>Projeto de código aberto (Licença MIT). Dados públicos de livre reprodução.</p>
          <p>Next.js SSG + JSON por município + Parquet</p>
        </div>
      </div>
    </footer>
  );
}
