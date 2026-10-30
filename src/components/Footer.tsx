import Link from "next/link";
import { Landmark } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#e7e2d9] bg-[#f6f3ee] text-slate-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-civic-ink text-white flex items-center justify-center">
                <Landmark className="w-3.5 h-3.5 text-[#ede7dd]" />
              </div>
              <span className="font-serif font-bold text-base text-civic-ink">
                Orçamento Cidadão
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md">
              Iniciativa de controle social e transparência cívica sem fins lucrativos.
              Os dados são extraídos dos relatórios oficiais RREO e RGF enviados pelos municípios
              ao Sistema de Informações Contábeis e Fiscais do Setor Público Brasileiro (SICONFI/STN).
            </p>
            <p className="text-xs text-slate-500 pt-1">
              Arquitetura Jamstack estática, sem servidores de banco de dados ativos e custo zero de infraestrutura.
            </p>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-civic-ink text-xs uppercase tracking-wider mb-3">
              Navegação
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/" className="hover:text-civic-ink hover:underline">
                  Buscar Municípios
                </Link>
              </li>
              <li>
                <Link href="/comparar/" className="hover:text-civic-ink hover:underline">
                  Comparador Lado a Lado
                </Link>
              </li>
              <li>
                <Link href="/dicionario/" className="hover:text-civic-ink hover:underline">
                  Dicionário Orçamentário Cidadão
                </Link>
              </li>
              <li>
                <Link href="/cidade/3518800/" className="hover:text-civic-ink hover:underline">
                  Raio-X: Guarulhos (SP)
                </Link>
              </li>
              <li>
                <Link href="/cidade/3550308/" className="hover:text-civic-ink hover:underline">
                  Raio-X: São Paulo (SP)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-civic-ink text-xs uppercase tracking-wider mb-3">
              Fontes Oficiais
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <a
                  href="https://siconfi.tesouro.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-civic-ink hover:underline"
                >
                  SICONFI / Tesouro Nacional
                </a>
              </li>
              <li>
                <a
                  href="https://www.ibge.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-civic-ink hover:underline"
                >
                  IBGE (Censo Demográfico)
                </a>
              </li>
              <li>
                <a
                  href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-civic-ink hover:underline"
                >
                  Lei Complementar nº 101/2000 (LRF)
                </a>
              </li>
              <li className="pt-2 text-[11px] text-slate-500 font-mono">
                Pipeline ETL atualizado todo dia 5 via GitHub Actions
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#e2ddd3] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>Projeto de código aberto (Licença MIT). Dados públicos de livre reprodução.</p>
          <p className="font-mono text-[11px] text-slate-500">
            Next.js SSG + DuckDB-Wasm + Parquet
          </p>
        </div>
      </div>
    </footer>
  );
}
