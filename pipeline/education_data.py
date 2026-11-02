#!/usr/bin/env python3
"""
Orçamento Cidadão - Educação: alunos da rede pública e peso do pessoal
----------------------------------------------------------------------
Duas métricas novas, sempre a partir de fontes oficiais:

1. Total de alunos no ensino público
   * INEP - Censo Escolar (microdados da Educação Básica).
   * Conta matrículas (QT_MAT_BAS) das dependências federal (1),
     estadual (2) e municipal (3), além da rede privada (4) para contexto.
   * O arquivo nacional tem ~32 MB compactado e é baixado uma única vez para
     ``pipeline/cache/inep/``; o agregado por município fica em CSV.

2. % da despesa de Educação gasta com pessoal
   * SICONFI - MSC Orçamentária (matriz de encerramento anual, MSCE).
   * Numerador: natureza de despesa 3.1 (pessoal e encargos) na função 12,
     excluindo as transferências intra-orçamentárias (natureza 3.1.91).
   * Denominador: despesa empenhada total da função 12, com a mesma exclusão.
   * A despesa empenhada é reconstruída a partir das contas 622130400
     (pagas), 622130500, 622130600 e 622130700 (restos a pagar), cuja soma
     bate exatamente com o total empenhado do DCA Anexo I-D.
   * Alguns entes não detalham a execução na MSCE; nesses casos a MSCC mensal
     (saldo final de dezembro) é usada como alternativa.
   * Se o total reconstruído ficar abaixo da metade do RREO Anexo 02 do mesmo
     exercício, a matriz está incompleta e o indicador é omitido.

O RREO Anexo 08 (MDE) não é disponibilizado pela API do SICONFI, e o SIOPE
exige autenticação; por isso o recorte é "pessoal e encargos da Educação"
(inclui professores e demais servidores da área), não apenas magistério.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import os
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx

logger = logging.getLogger("education-data")

BASE_SICONFI_URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"
INEP_ZIP_URL = (
    "https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_{year}.zip"
)

# Years the INEP microdata may be available for, newest first.
INEP_YEARS = (2025, 2024, 2023)

# MSC accounts that together add up to the "despesa empenhada" of the year:
# pagas + restos a pagar não processados + restos a pagar processados.
EMPENHADA_ACCOUNTS = ("622130400", "622130500", "622130600", "622130700")
# 3.1.91 = pessoal e encargos transferidos dentro do próprio orçamento
# (intra-orçamentárias), que o RREO Anexo 02 reporta em bloco separado.
INTRA_PERSONNEL_PREFIX = "3191"

# SICONFI caps a page at 5,000 rows; large capitals need a dozen pages.
MSC_PAGE_LIMIT = 5000
MSC_MAX_PAGES = 40

# Sanity thresholds. Brazilian municipalities must apply at least 25% of their
# revenue to education and most of that goes to payroll, so a share below 10%
# or an annual education budget below R$ 100 thousand means the matrix is
# incomplete, not that the city spends nothing.
MIN_PERSONNEL_SHARE = 10.0
MIN_EDUCATION_TOTAL = 100_000.0


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------


def _write_json_atomic(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


# ---------------------------------------------------------------------------
# INEP - Censo Escolar
# ---------------------------------------------------------------------------


def _students_cache_path(cache_dir: Path, year: int) -> Path:
    return cache_dir / "inep" / f"students_by_city_{year}.csv"


def _inep_zip_path(cache_dir: Path, year: int) -> Path:
    return cache_dir / "inep" / f"microdados_censo_escolar_{year}.zip"


def _download_inep(client: httpx.Client, cache_dir: Path, year: int) -> Optional[Path]:
    """Download the national microdata once; returns None when not published."""
    path = _inep_zip_path(cache_dir, year)
    if path.exists() and path.stat().st_size > 1_000_000:
        return path
    url = INEP_ZIP_URL.format(year=year)
    logger.info("Baixando microdados do Censo Escolar %d (%s)...", year, url)
    try:
        with client.stream("GET", url, timeout=600.0) as response:
            if response.status_code != 200:
                logger.info("Censo Escolar %d indisponível (HTTP %s).", year, response.status_code)
                return None
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".part")
            with open(tmp, "wb") as fh:
                for chunk in response.iter_bytes(chunk_size=1 << 20):
                    fh.write(chunk)
            os.replace(tmp, path)
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("Falha ao baixar o Censo Escolar %d: %s", year, exc)
        return None
    return path


def build_students_table(zip_path: Path, out_csv: Path) -> int:
    """Aggregate QT_MAT_BAS per municipality/dependency straight from the ZIP."""
    with zipfile.ZipFile(zip_path) as archive:
        member = next(
            (
                name
                for name in archive.namelist()
                if name.lower().endswith(".csv") and "microdados_ed_basica" in name.lower()
            ),
            None,
        )
        if member is None:
            raise RuntimeError(f"Nenhum CSV de microdados em {zip_path}")

        totals: Dict[str, Dict[str, int]] = {}
        with archive.open(member) as raw:
            text = io.TextIOWrapper(raw, encoding="latin-1", newline="")
            reader = csv.DictReader(text, delimiter=";")
            for row in reader:
                # 1 = em atividade; escolas paralisadas/extintas entram com 0.
                if (row.get("TP_SITUACAO_FUNCIONAMENTO") or "").strip() != "1":
                    continue
                code = (row.get("CO_MUNICIPIO") or "").strip()
                dependency = (row.get("TP_DEPENDENCIA") or "").strip()
                if not code or code == "0" or dependency not in ("1", "2", "3", "4"):
                    continue
                try:
                    enrolled = int(float(row.get("QT_MAT_BAS") or 0))
                except ValueError:
                    enrolled = 0
                bucket = totals.setdefault(
                    code,
                    {"federal": 0, "estadual": 0, "municipal": 0, "privada": 0},
                )
                bucket[
                    {"1": "federal", "2": "estadual", "3": "municipal", "4": "privada"}[
                        dependency
                    ]
                ] += enrolled

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(out_csv, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "ibge_code",
                "federal",
                "estadual",
                "municipal",
                "privada",
                "publico",
                "total",
            ]
        )
        for code in sorted(totals):
            row = totals[code]
            public = row["federal"] + row["estadual"] + row["municipal"]
            writer.writerow(
                [
                    code,
                    row["federal"],
                    row["estadual"],
                    row["municipal"],
                    row["privada"],
                    public,
                    public + row["privada"],
                ]
            )
    return len(totals)


def ensure_students_table(
    cache_dir: Path, year: Optional[int] = None, timeout: float = 600.0
) -> Tuple[Optional[Path], Optional[int]]:
    """Return the cached aggregate CSV and its year, downloading only if needed."""
    # Offline-friendly: if an aggregate already exists, never touch the network.
    if year:
        out_csv = _students_cache_path(cache_dir, year)
        if out_csv.exists():
            return out_csv, year
    for candidate in INEP_YEARS:
        out_csv = _students_cache_path(cache_dir, candidate)
        if out_csv.exists():
            return out_csv, candidate

    candidates = (year,) if year else INEP_YEARS
    if year:
        candidates = (year,) + tuple(y for y in INEP_YEARS if y != year)

    with httpx.Client(
        headers={"User-Agent": "OrcamentoCidadao-INEP-Sync/1.0"}, follow_redirects=True
    ) as client:
        for candidate in candidates:
            out_csv = _students_cache_path(cache_dir, candidate)
            zip_path = _inep_zip_path(cache_dir, candidate)
            if not zip_path.exists():
                zip_path = _download_inep(client, cache_dir, candidate)  # type: ignore[assignment]
            if not zip_path:
                continue
            logger.info("Agregando matrículas do Censo Escolar %d...", candidate)
            started = time.time()
            count = build_students_table(zip_path, out_csv)
            logger.info(
                "Censo Escolar %d: %s municípios em %.1fs", candidate, f"{count:,}", time.time() - started
            )
            return out_csv, candidate
    return None, None


def load_students(cache_dir: Path) -> Tuple[Dict[str, Dict[str, int]], Optional[int]]:
    """Load the aggregate CSV (building it when the cache is empty)."""
    path, year = ensure_students_table(cache_dir)
    if not path or not year:
        return {}, None
    result: Dict[str, Dict[str, int]] = {}
    with open(path, "r", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            result[row["ibge_code"]] = {
                "federal": int(row["federal"]),
                "estadual": int(row["estadual"]),
                "municipal": int(row["municipal"]),
                "privada": int(row["privada"]),
                "publico": int(row["publico"]),
                "total": int(row["total"]),
            }
    return result, year


# ---------------------------------------------------------------------------
# SICONFI - MSC Orçamentária (MSCE)
# ---------------------------------------------------------------------------


def _msc_cache_path(
    cache_dir: Path, year: int, ibge_code: str, matrix: str = "MSCE"
) -> Path:
    suffix = "" if matrix == "MSCE" else "_mscc"
    return cache_dir / "msc" / str(year) / f"{ibge_code}{suffix}.json"


def summarize_msc(
    items: Iterable[Dict[str, Any]], reference: Optional[float] = None
) -> Optional[Dict[str, Any]]:
    """Turn the raw MSCE rows of one entity into a tiny education summary.

    Three quirks of the SICONFI matrices are handled here:

    * Most entities only report the debit (``D``) side of the execution
      accounts, so the sum of debits is the amount spent.
    * Some report the credit (``C``) side as well: either as a mirror of the
      debits (net = 0) or as the balancing entry of a double-entry system
      (net = the real execution). Both readings are computed and, when the
      official RREO total is available, the one closer to it wins.
    * The monthly matrix (MSCC) reports ``ending_balance``, where every row is
      a credit balance. There the net (``D - C``) is negative and gets flipped.
    """
    total_d = total_c = 0.0
    personnel_d = personnel_c = 0.0
    seen = False
    for row in items:
        if row.get("funcao") != "12":
            continue
        if row.get("conta_contabil") not in EMPENHADA_ACCOUNTS:
            continue
        try:
            value = float(row.get("valor") or 0.0)
        except (TypeError, ValueError):
            continue
        nature = str(row.get("natureza_despesa") or "")
        seen = True
        if nature.startswith(INTRA_PERSONNEL_PREFIX):
            # Transferência de pessoal dentro do próprio orçamento: fora dos
            # dois lados da conta para não inflar o denominador.
            continue
        if row.get("natureza_conta") == "C":
            total_c += value
            if nature.startswith("31"):
                personnel_c += value
        else:
            total_d += value
            if nature.startswith("31"):
                personnel_d += value

    if not seen:
        return None

    candidates: List[Tuple[float, float, str]] = []
    if total_d > 0 and personnel_d > 0:
        candidates.append((total_d, personnel_d, "debit"))
    net_total = total_d - total_c
    net_personnel = personnel_d - personnel_c
    if net_total != 0 and net_personnel != 0:
        candidates.append((abs(net_total), abs(net_personnel), "net"))
    if not candidates:
        return None

    if reference is not None:
        candidates = [c for c in candidates if c[0] >= 0.5 * reference]
        if not candidates:
            return None
        total, personnel, basis = min(
            candidates, key=lambda c: abs(c[0] - reference) / reference
        )
    else:
        # Sem o RREO para arbitrar, a soma líquida (D - C) é o padrão contábil;
        # a soma dos débitos só é usada quando o líquido zera (espelhamento).
        net_candidates = [c for c in candidates if c[2] == "net"]
        total, personnel, basis = net_candidates[0] if net_candidates else candidates[0]

    if total <= 0 or personnel <= 0:
        return None

    share = personnel / total * 100.0
    if share < MIN_PERSONNEL_SHARE or total < MIN_EDUCATION_TOTAL:
        # Matriz incompleta: o total não representa o exercício inteiro.
        return None
    return {
        "education_total": round(total, 2),
        "education_personnel": round(personnel, 2),
        "personnel_share_pct": round(max(0.0, min(share, 100.0)), 2),
        "basis": basis,
    }


def fetch_msc_education(
    client: httpx.Client,
    ibge_code: str,
    ente_id: int,
    year: int,
    cache_dir: Path,
    refresh: bool = False,
    blocker: Optional[Any] = None,
    timeout: float = 180.0,
    max_attempts: int = 5,
    matrix: str = "MSCE",
    value_type: str = "period_change",
) -> Tuple[Optional[Dict[str, Any]], str]:
    """Fetch every page of the MSC for one entity and cache the summary.

    Returns ``(summary, status)`` where status is ``ok`` (data cached),
    ``empty`` (entity simply has no matrix for that year) or ``error``
    (throttling/timeout — worth retrying later, so the caller must not fall
    back to an older year).
    """
    path = _msc_cache_path(cache_dir, year, ibge_code, matrix)
    if path.exists() and not refresh:
        try:
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if data.get("empty"):
                return None, "empty"
            if _passes_sanity(data, cache_dir, ibge_code, year):
                return data, "ok"
            # Summary below the RREO reference: ignore it and fetch again.
        except Exception:
            pass

    items: List[Dict[str, Any]] = []
    offset = 0
    for _ in range(MSC_MAX_PAGES):
        params = {
            "id_ente": ente_id,
            "an_referencia": year,
            "me_referencia": 12,
            "co_tipo_matriz": matrix,
            "classe_conta": 6,
            "id_tv": value_type,
            "offset": offset,
            # Server-side filter: ORDS JSON filtering keeps only function 12
            # (Educação). Full matrices reach 100k rows for some entities.
            "q": json.dumps({"funcao": "12"}),
        }
        payload: Optional[Dict[str, Any]] = None
        for attempt in range(max_attempts):
            if blocker is not None:
                blocker()
            try:
                response = client.get(
                    f"{BASE_SICONFI_URL}/msc_orcamentaria",
                    params=params,
                    timeout=timeout,
                )
            except Exception as exc:  # pragma: no cover - network dependent
                logger.warning(
                    "MSC %s/%d tentativa %d falhou: %s", ibge_code, year, attempt + 1, exc
                )
                time.sleep(min(2 ** attempt, 16))
                continue
            if response.status_code == 429 or response.status_code >= 500:
                # The Tesouro throttles the whole IP, so every worker must
                # slow down — not just the one that got the 429.
                if hasattr(blocker, "penalize"):
                    blocker.penalize(min(5 * (attempt + 1), 30))
                time.sleep(min(2 ** (attempt + 1), 30))
                continue
            if response.status_code != 200:
                logger.info(
                    "MSC %s/%d indisponível (HTTP %s).",
                    ibge_code,
                    year,
                    response.status_code,
                )
                return None, "empty"
            try:
                payload = response.json()
            except ValueError:
                time.sleep(2)
                continue
            break
        if payload is None:
            logger.warning("MSC %s/%d: desistindo após %d tentativas.", ibge_code, year, max_attempts)
            return None, "error"

        batch = payload.get("items") or []
        items.extend(batch)
        if not payload.get("hasMore") or not batch:
            break
        offset += len(batch)

    reference = _rreo_education_total(cache_dir, ibge_code, year)
    summary = summarize_msc(items, reference)
    if summary is None:
        _write_json_atomic(
            path,
            {
                "year": year,
                "matrix": matrix,
                "empty": True,
                "rows": len(items),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        return None, "empty"
    if not _passes_sanity(summary, cache_dir, ibge_code, year):
        logger.info(
            "MSC %s/%d (%s) incompleta: %.0f de %.0f (RREO); tentando outra matriz.",
            ibge_code,
            year,
            matrix,
            summary["education_total"],
            _rreo_education_total(cache_dir, ibge_code, year) or 0.0,
        )
        return None, "empty"
    summary["year"] = year
    summary["matrix"] = matrix
    summary["rows"] = len(items)
    summary["fetched_at"] = datetime.now(timezone.utc).isoformat()
    _write_json_atomic(path, summary)
    return summary, "ok"


def _passes_sanity(
    summary: Dict[str, Any], cache_dir: Path, ibge_code: str, year: int
) -> bool:
    """Reject summaries whose total is clearly below the official RREO line.

    Some entities send a matrix that only covers part of the year (e.g. one
    month). The ratio built on it would look plausible but be meaningless, so
    the entity is retried with the monthly matrix instead.
    """
    reference = _rreo_education_total(cache_dir, ibge_code, year)
    if summary.get("education_total", 0.0) < MIN_EDUCATION_TOTAL:
        return False
    if summary.get("personnel_share_pct", 0.0) < MIN_PERSONNEL_SHARE:
        return False
    if reference is None:
        return True
    return summary.get("education_total", 0.0) >= 0.5 * reference


def cached_msc_education(
    cache_dir: Path, ibge_code: str, years: Iterable[int]
) -> Optional[Dict[str, Any]]:
    for year in years:
        for matrix in ("MSCE", "MSCC"):
            path = _msc_cache_path(cache_dir, year, ibge_code, matrix)
            if not path.exists():
                continue
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
            except Exception:
                continue
            if data.get("personnel_share_pct") is not None and _passes_sanity(
                data, cache_dir, ibge_code, int(data.get("year") or year)
            ):
                return data
    return None


# ---------------------------------------------------------------------------
# Enrichment used by extract_siconfi.py
# ---------------------------------------------------------------------------


def _rreo_education_total(cache_dir: Path, ibge_code: str, year: int) -> Optional[float]:
    """Read the official education total (RREO Anexo 02) from the local cache.

    Used only as a sanity check: when the MSCE of an entity is clearly
    incomplete (e.g. it reports one month instead of the accumulated year),
    the personnel share derived from it would be meaningless. The RREO line is
    the accumulated "Despesas Empenhadas" of the last bimestre and matches the
    MSC simulation exactly when both are complete.
    """
    path = cache_dir / str(year) / ibge_code / "rreo.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            items = json.load(fh).get("items") or []
    except Exception:
        return None
    for row in items:
        if row.get("anexo") != "RREO-Anexo 02":
            continue
        if row.get("periodo") not in (None, 6):
            continue  # partial period: not comparable with the full year
        if (row.get("conta") or "").strip() != "Educação":
            continue
        if not (row.get("coluna") or "").startswith("DESPESAS EMPENHADAS ATÉ"):
            continue
        try:
            value = float(row.get("valor") or 0.0)
        except (TypeError, ValueError):
            continue
        if value > 0:
            return value
    return None


def build_education_block(
    record: Dict[str, Any],
    students: Dict[str, Dict[str, int]],
    students_year: Optional[int],
    cache_dir: Path,
) -> Optional[Dict[str, Any]]:
    """Attach the two education indicators to a city record (best effort)."""
    block: Dict[str, Any] = {}
    enrolled = students.get(record.get("ibge_code", ""))
    if enrolled and students_year:
        block["students"] = {
            "year": students_year,
            "public_total": enrolled["publico"],
            "federal": enrolled["federal"],
            "estadual": enrolled["estadual"],
            "municipal": enrolled["municipal"],
            "private": enrolled["privada"],
        }

    if record.get("data_source") != "synthetic":
        fiscal_year = int(record.get("fiscal_year") or 0)
        years = [fiscal_year, fiscal_year - 1, fiscal_year - 2]
        msc = cached_msc_education(cache_dir, record["ibge_code"], years)
        if msc:
            reference = _rreo_education_total(
                cache_dir, record["ibge_code"], int(msc["year"])
            )
            # An MSCE that reports less than half of the official RREO total is
            # incomplete (partial period). Showing a ratio built on it would be
            # worse than showing nothing.
            if reference is None or msc["education_total"] >= 0.5 * reference:
                block["personnel"] = {
                    "year": msc["year"],
                    "percentage": msc["personnel_share_pct"],
                    "personnel_expense": msc["education_personnel"],
                    "education_expense": msc["education_total"],
                }

    return block or None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pré-baixa as métricas de educação (Censo Escolar + SICONFI MSC)."
    )
    parser.add_argument("--cache-dir", default="pipeline/cache")
    parser.add_argument("--cities-dir", default="public/data/cities")
    parser.add_argument("--index-path", default="public/data/cities_index.json")
    parser.add_argument(
        "--students-year",
        type=int,
        default=0,
        help="Ano do Censo Escolar (padrão: o mais recente publicado)",
    )
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--rate", type=float, default=6.0)
    parser.add_argument("--refresh", action="store_true", help="Ignora o cache do MSC")
    parser.add_argument(
        "--skip-msc", action="store_true", help="Somente monta a tabela do Censo Escolar"
    )
    parser.add_argument("--limit", type=int, default=0, help="Processa apenas N municípios")
    parser.add_argument(
        "--only",
        default="",
        help="Lista de códigos IBGE separados por vírgula (execução direcionada)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    cache_dir = Path(args.cache_dir)

    _, year = ensure_students_table(cache_dir, args.students_year or None)
    if not year:
        logger.warning("Não foi possível montar a tabela de matrículas do Censo Escolar.")
    else:
        logger.info("Matrículas do Censo Escolar %d prontas.", year)

    if args.skip_msc:
        return

    # Targets: every municipality with a real record, using the same year the
    # site displays so the two education numbers are coherent.
    cities_dir = Path(args.cities_dir)
    targets: List[Tuple[str, int]] = []
    for path in sorted(cities_dir.glob("*.json")):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                record = json.load(fh)
        except Exception:
            continue
        if record.get("data_source") == "synthetic":
            continue
        targets.append((str(record["ibge_code"]), int(record.get("fiscal_year") or 0)))
    if args.only:
        wanted = {code.strip() for code in args.only.split(",") if code.strip()}
        targets = [item for item in targets if item[0] in wanted]
    if args.limit:
        targets = targets[: args.limit]

    class Limiter:
        """Spaces requests evenly across worker threads and applies a shared
        cooldown whenever the Tesouro answers 429."""

        def __init__(self, per_second: float) -> None:
            self.interval = 1.0 / per_second if per_second > 0 else 0.0
            self.lock = __import__("threading").Lock()
            self.next_at = 0.0
            self.pause_until = 0.0

        def __call__(self) -> None:
            with self.lock:
                now = time.monotonic()
                start = max(now, self.next_at, self.pause_until)
                self.next_at = start + self.interval
                wait = start - now
            if wait > 0:
                time.sleep(wait)

        def penalize(self, seconds: float) -> None:
            with self.lock:
                self.pause_until = max(self.pause_until, time.monotonic() + seconds)

    limiter = Limiter(args.rate)
    done = 0
    missing = 0
    errors = 0
    started = time.time()
    thread_state = __import__("threading").local()

    def _client() -> httpx.Client:
        client = getattr(thread_state, "client", None)
        if client is None:
            client = httpx.Client(
                headers={"User-Agent": "OrcamentoCidadao-SICONFI-Sync/2.0"},
                follow_redirects=True,
            )
            thread_state.client = client
        return client

    def worker(code: str, fiscal_year: int) -> Tuple[str, str]:
        years = [y for y in (fiscal_year, fiscal_year - 1, fiscal_year - 2) if y >= 2013]
        if not args.refresh and cached_msc_education(cache_dir, code, years):
            return code, "ok"
        ente_id = 53 if code == "5300108" else int(code)
        for candidate in years:
            # MSCE is the annual closing matrix; when the entity does not
            # detail the budget execution there, the monthly matrix (MSCC)
            # at its December ending balance carries the same accounts.
            for matrix, value_type in (
                ("MSCE", "period_change"),
                ("MSCC", "ending_balance"),
            ):
                result, status = fetch_msc_education(
                    _client(),
                    code,
                    ente_id,
                    candidate,
                    cache_dir,
                    refresh=args.refresh,
                    blocker=limiter,
                    matrix=matrix,
                    value_type=value_type,
                )
                if result:
                    return code, "ok"
                if status == "error":
                    return code, "error"
        return code, "missing"

    with ThreadPoolExecutor(max_workers=max(args.workers, 1)) as executor:
        futures = [executor.submit(worker, code, year) for code, year in targets]
        for completed, future in enumerate(as_completed(futures), start=1):
            try:
                _, status = future.result()
            except Exception as exc:
                logger.warning("Falha inesperada: %s", exc)
                status = "missing"
            done += 1
            if status != "ok":
                missing += 1
            if status == "error":
                errors += 1
            if completed % 100 == 0 or completed == len(futures):
                elapsed = time.time() - started
                rate = completed / elapsed if elapsed else 0
                eta = (len(futures) - completed) / rate if rate else 0
                logger.info(
                    "MSC %d/%d | sem dados=%d | erros=%d | %.1f cidade/s | ETA %s",
                    completed,
                    len(futures),
                    missing,
                    errors,
                    rate,
                    time.strftime("%H:%M:%S", time.gmtime(eta)),
                )

    logger.info(
        "MSC concluído: %d cidades, %d sem dados, %d com erro (%.1f%% de cobertura).",
        done,
        missing,
        errors,
        (done - missing) / done * 100 if done else 0.0,
    )


if __name__ == "__main__":
    main()
