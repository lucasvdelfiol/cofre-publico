import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Raio-X dos Gastos Públicos Municipais`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "orçamento público",
    "SICONFI",
    "gastos municipais",
    "transparência pública",
    "LRF",
    "saúde por habitante",
    "educação por habitante",
    "contas públicas",
  ],
  authors: [{ name: "Cofre Público", url: "https://github.com/lucasvdelfiol/cofre-publico" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Raio-X dos Gastos Públicos Municipais`,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Raio-X dos Gastos Públicos Municipais`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex flex-col min-h-screen bg-ink-900 text-bone-100 antialiased selection:bg-acid selection:text-ink-950">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-acid focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-ink-950"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
