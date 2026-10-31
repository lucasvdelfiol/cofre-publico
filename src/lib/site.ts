import { BASE_PATH } from "./paths";

/**
 * Public production URL. Override with NEXT_PUBLIC_SITE_URL if the project
 * moves to a custom domain; otherwise it mirrors the GitHub Pages project page.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || `https://lucasvdelfiol.github.io${BASE_PATH}`
).replace(/\/$/, "");

export const SITE_NAME = "Cofre Público";

export const SITE_DESCRIPTION =
  "Explore, compare e entenda as contas públicas dos 5.571 municípios brasileiros em linguagem simples, com dados oficiais do SICONFI/Tesouro Nacional.";

/** Absolute URL for a path inside the app (always with trailing slash). */
export function absoluteUrl(pathname = "/"): string {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  return clean ? `${SITE_URL}/${clean}/` : `${SITE_URL}/`;
}
