/**
 * GitHub Pages project sites are served from a subpath
 * (e.g. https://user.github.io/cofre-publico/), so every runtime fetch of a
 * file inside /public must be prefixed with the same basePath.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function publicDataPath(file: string): string {
  return `${BASE_PATH}/data/${file.replace(/^\/+/, "")}`;
}
