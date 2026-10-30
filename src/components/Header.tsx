"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/cidade/3518800/", label: "Raio-X (Exemplo: Guarulhos)" },
    { href: "/comparar/", label: "Comparador" },
    { href: "/dicionario/", label: "Dicionário Cidadão" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#fbfaf8]/95 backdrop-blur-sm border-b border-[#e7e2d9] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo / Masthead */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-md bg-civic-ink text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-4 h-4 text-[#ede7dd]" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-civic-ink">
                  Orçamento Cidadão
                </span>
                <span className="text-[11px] font-sans font-medium text-slate-500 hidden sm:inline">
                  Brasil
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Contas municipais em linguagem simples e métricas por habitante
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-xs sm:text-sm transition-colors ${
                    isActive
                      ? "bg-[#ede7dd] text-civic-ink font-semibold"
                      : "text-slate-600 hover:text-civic-ink hover:bg-[#f3ede3]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
