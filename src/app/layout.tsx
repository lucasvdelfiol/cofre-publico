import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Cofre Público | Raio-X dos Gastos Públicos Municipais",
  description:
    "Explore, compare e entenda as contas públicas de todos os municípios brasileiros em linguagem simples, sem termos contábeis difíceis e 100% grátis.",
  keywords: [
    "orçamento público",
    "SICONFI",
    "gastos municipais",
    "transparência pública",
    "LRF",
    "saúde por habitante",
    "educação por habitante",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex flex-col min-h-screen text-slate-900 bg-slate-50 antialiased selection:bg-brand-500 selection:text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
