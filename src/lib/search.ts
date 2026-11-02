import { CityIndexItem } from "./types";

/**
 * Busca tolerante a acentos, ordem das palavras e pequenos erros de digitação.
 *
 * O índice nacional tem 5.571 municípios e ~1 MB, então a normalização é
 * feita uma única vez por cidade (cache em memória) e as comparações usam
 * apenas ASCII minúsculo, sem acentos.
 */

const UF_NAMES: Record<string, string> = {
  AC: "acre",
  AL: "alagoas",
  AP: "amapa",
  AM: "amazonas",
  BA: "bahia",
  CE: "ceara",
  DF: "distrito federal",
  ES: "espirito santo",
  GO: "goias",
  MA: "maranhao",
  MT: "mato grosso",
  MS: "mato grosso do sul",
  MG: "minas gerais",
  PA: "para",
  PB: "paraiba",
  PR: "parana",
  PE: "pernambuco",
  PI: "piaui",
  RJ: "rio de janeiro",
  RN: "rio grande do norte",
  RS: "rio grande do sul",
  RO: "rondonia",
  RR: "roraima",
  SC: "santa catarina",
  SP: "sao paulo",
  SE: "sergipe",
  TO: "tocantins",
};

const STATE_NAMES = new Set(Object.values(UF_NAMES));

/** Apelidos populares que não aparecem no nome oficial do município. */
const ALIASES: Record<string, string> = {
  floripa: "4205407",
  sampa: "3550308",
  bh: "3106200",
};

/** Remove acentos, caixa alta e pontuação ("D'Água" → "d agua"). */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface CityMeta {
  name: string;
  compact: string;
  words: string[];
  state: string;
}

const metaCache = new Map<string, CityMeta>();

function metaOf(city: CityIndexItem): CityMeta {
  const key = `${city.ibge_code}:${city.city_name}`;
  let meta = metaCache.get(key);
  if (!meta) {
    const name = normalize(city.city_name);
    meta = {
      name,
      compact: name.replace(/ /g, ""),
      words: name.split(" ").filter(Boolean),
      state: UF_NAMES[city.uf.toUpperCase()] ?? normalize(city.uf),
    };
    metaCache.set(key, meta);
  }
  return meta;
}

/** Distância de Levenshtein com corte: retorna `limit + 1` quando passa do teto. */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

/** "grulhos" é subsequência de "guarulhos" (letras na mesma ordem). */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (needle[i] === haystack[j]) i += 1;
  }
  return i === needle.length;
}

/**
 * Um termo casa com uma palavra do nome quando é prefixo, está contido, é
 * subsequência (só para termos longos) ou está a 1–2 letras de distância.
 * Termos curtos (≤ 3) exigem prefixo/continência para não virar ruído.
 */
function wordMatches(token: string, word: string): boolean {
  if (word.startsWith(token) || word.includes(token)) return true;
  if (token.length >= 5 && isSubsequence(token, word)) return true;
  if (token.length < 6) return false;
  const limit = token.length >= 9 ? 2 : 1;
  return editDistance(token, word, limit) <= limit;
}

function stateMatchesToken(meta: CityMeta, uf: string, token: string): boolean {
  if (token === uf.toLowerCase()) return true;
  if (token.length < 3) return false;
  return meta.state === token || meta.state.split(" ").includes(token);
}

function directScore(
  meta: CityMeta,
  city: CityIndexItem,
  query: string,
  tokens: string[]
): number | null {
  const uf = city.uf.toLowerCase();
  const compactQuery = query.replace(/ /g, "");

  if (meta.name === query) return 0;
  if (meta.compact === compactQuery) return 1;
  if (city.ibge_code === query) return 2;
  // Sigla do estado ("SP", "RJ") antes de qualquer casamento por substring.
  if (query === uf) return 5;

  if (meta.name.startsWith(query)) return 10;
  if (meta.compact.startsWith(compactQuery)) return 12;
  if (city.ibge_code.startsWith(query)) return 14;

  // Com 1–2 letras, só faz sentido prefixo de nome, UF ou código.
  if (query.length <= 2) return null;

  if (meta.words.some((word) => word.startsWith(query))) return 20;
  if (meta.name.includes(query)) return 30;
  // "olho dagua" / "saopaulo": a forma sem espaços cobre apóstrofos e nomes
  // compostos digitados de uma vez só.
  if (meta.compact.includes(compactQuery)) return 32;

  if (tokens.length > 1) {
    const anyNameMatch = tokens.some((token) =>
      meta.words.some((word) => wordMatches(token, word))
    );
    const allMatch = tokens.every(
      (token) =>
        meta.words.some((word) => wordMatches(token, word)) ||
        city.ibge_code.startsWith(token) ||
        // "itabuna bahia": o nome casa e o estado completa a consulta.
        (anyNameMatch && stateMatchesToken(meta, city.uf, token))
    );
    if (allMatch) return 40;
  }

  if (city.ibge_code.includes(query)) return 55;
  return null;
}

/**
 * Retorna até `limit` municípios ordenados por relevância e, em empate, pelo
 * tamanho da população (quem digita "campinas" quer a Campinas grande).
 */
export function searchCities(
  cities: CityIndexItem[],
  rawQuery: string,
  limit = 8
): CityIndexItem[] {
  const query = normalize(rawQuery);
  const byRelevance = (a: { city: CityIndexItem; score: number }, b: typeof a) =>
    a.score - b.score ||
    b.city.population - a.city.population ||
    a.city.city_name.localeCompare(b.city.city_name);

  if (!query) {
    return [...cities]
      .sort((a, b) => b.population - a.population)
      .slice(0, limit);
  }

  const tokens = query.split(" ").filter(Boolean);
  const stateQuery = STATE_NAMES.has(query);
  const aliasCode = ALIASES[query];
  const results: Array<{ city: CityIndexItem; score: number }> = [];
  const seen = new Set<string>();

  for (const city of cities) {
    const score = directScore(metaOf(city), city, query, tokens);
    if (score === null) continue;
    // Ao digitar o nome completo de um estado, o usuário quer a lista de
    // municípios dele — não cidades homônimas espalhadas pelo país.
    if (stateQuery && score > 1) continue;
    results.push({ city, score });
    seen.add(city.ibge_code);
  }

  if (aliasCode && !seen.has(aliasCode)) {
    const aliased = cities.find((city) => city.ibge_code === aliasCode);
    if (aliased) {
      results.push({ city: aliased, score: 0 });
      seen.add(aliasCode);
    }
  }

  if (stateQuery) {
    for (const city of cities) {
      if (seen.has(city.ibge_code)) continue;
      if (city.uf.toLowerCase() === query || metaOf(city).state === query) {
        results.push({ city, score: 60 });
        seen.add(city.ibge_code);
      }
    }
  }

  // Só cai na aproximação quando nada casou: evita encher a lista de
  // "Santa Maria" quando o usuário digitou "Maricá".
  if (results.length === 0) {
    for (const city of cities) {
      if (seen.has(city.ibge_code)) continue;
      if (tokens.every((token) => fuzzyTokenMatch(token, metaOf(city)))) {
        results.push({ city, score: 70 });
        seen.add(city.ibge_code);
      }
    }
  }

  return results.sort(byRelevance).slice(0, limit).map((entry) => entry.city);
}

function fuzzyTokenMatch(token: string, meta: CityMeta): boolean {
  if (token.length < 3) return false;
  return meta.words.some((word) => wordMatches(token, word));
}
