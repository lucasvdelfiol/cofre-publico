import Link from "next/link";
import { Search, Landmark } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-civic-ink text-white">
        <Landmark className="w-5 h-5 text-[#ede7dd]" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          Erro 404
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-civic-ink tracking-tight">
          Esta página não existe
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          O endereço pode ter mudado ou o código do município está incorreto. Use a busca para
          abrir o raio-X de qualquer uma das 5.571 cidades brasileiras.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-civic-ink text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          <Search className="w-4 h-4" />
          Buscar um município
        </Link>
        <Link
          href="/sobre/"
          className="text-xs sm:text-sm text-slate-600 hover:text-civic-ink hover:underline"
        >
          Metodologia e fontes dos dados
        </Link>
      </div>
    </div>
  );
}
