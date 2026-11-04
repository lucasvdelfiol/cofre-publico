"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  // `compact` links are hidden on small screens so the masthead never
  // overflows; they remain reachable from the footer and the page content.
  const navLinks = [
    { href: "/", label: "Início", compact: true },
    { href: "/cidade/3518800/", label: "Raio-X", compact: false },
    { href: "/comparar/", label: "Comparador", compact: false },
    { href: "/dicionario/", label: "Dicionário", compact: true },
    { href: "/sobre/", label: "Fontes", compact: true },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink-600 bg-ink-950/95 backdrop-blur-md">
      <div className="h-[2px] w-full bg-acid" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
          {/* Masthead */}
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-acid/70 text-acid transition-colors group-hover:bg-acid group-hover:text-ink-950">
              <Landmark className="h-4 w-4" />
              <span className="absolute -bottom-px -right-px h-1.5 w-1.5 bg-acid transition-colors group-hover:bg-ink-950" />
            </span>
            <span className="leading-none">
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-lg font-bold tracking-tight text-bone-50 sm:text-xl">
                  Cofre Público
                </span>
                <span className="hidden font-mono text-[9px] uppercase tracking-masthead text-bone-500 sm:inline">
                  BR
                </span>
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-label text-bone-500">
                Arquivo fiscal · Brasil
              </span>
            </span>
          </Link>

          {/* Navigation */}
          <nav aria-label="Navegação principal" className="flex items-center gap-0.5 sm:gap-1">
            {navLinks.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${item.compact ? "hidden sm:inline-block" : ""} whitespace-nowrap px-2.5 py-2 font-mono text-[10px] uppercase tracking-label transition-colors sm:px-3 sm:text-[11px] ${
                    isActive
                      ? "bg-ink-800 text-acid"
                      : "text-bone-400 hover:bg-ink-800 hover:text-bone-50"
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
