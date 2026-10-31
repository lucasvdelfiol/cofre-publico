#!/usr/bin/env python3
"""
Orçamento Cidadão - Full National SICONFI & IBGE Data Extraction Pipeline
-------------------------------------------------------------------------
Extracts, normalizes, and pre-computes municipal spending and fiscal health
indicators for all 5,571 Brazilian municipalities.

Data sources (all official):
  * IBGE  - municipality list + Census 2022 population
  * SICONFI / Tesouro Nacional
      - RREO Anexo 01 (Balanço Orçamentário)  -> revenue, expense, transfers
      - RREO Anexo 02 (Despesa por Função)    -> health, education, urbanism,
                                                 administration, legislative
      - RGF  Anexo 01 (Despesa com Pessoal)   -> personnel expense / RCL
      - DCA  Anexo I-E (Despesa por Função)   -> 4 previous years for the
                                                 historical per-capita series

Only municipalities that do not publish the required SICONFI reports fall back
to a deterministic synthetic record, and those records are explicitly tagged
with ``"data_source": "synthetic"``.

The pipeline is resumable: every API response is cached under
``pipeline/cache/`` so an interrupted run can be restarted without re-fetching.
"""

import argparse
import json
import logging
import os
import random
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("siconfi-full-pipeline")
logging.getLogger("httpx").setLevel(logging.WARNING)

BASE_SICONFI_URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"
IBGE_MUNICIPIOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
IBGE_POP_URL = (
    "https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/"
    "variaveis/93?localidades=N6[all]"
)

REQUEST_TIMEOUT = 90.0
MAX_RETRIES = 4

# SICONFI uses a different entity id for the Federal District.
DF_IBGE_CODE = "5300108"
DF_SICONFI_ID = 53

FUNCTION_CODES = {
    "01": "legislative",
    "04": "administration",
    "10": "health",
    "12": "education",
    "15": "urbanism",
}

FUNCTION_LABELS = {
    "Legislativa": "legislative",
    "Administração": "administration",
    "Saúde": "health",
    "Educação": "education",
    "Urbanismo": "urbanism",
}


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


class RateLimiter:
    """Global token bucket that spaces requests evenly across worker threads."""

    def __init__(self, requests_per_second: float) -> None:
        self.interval = 1.0 / max(requests_per_second, 0.1)
        self._next = time.monotonic()
        self._lock = threading.Lock()

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next)
            self._next = slot + self.interval
        delay = slot - time.monotonic()
        if delay > 0:
            time.sleep(delay)


def _write_json_atomic(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)
    os.replace(tmp, path)


def request_json(
    client: httpx.Client,
    endpoint: str,
    params: Dict[str, Any],
    cache_file: Path,
    limiter: RateLimiter,
    refresh: bool = False,
) -> Optional[Dict[str, Any]]:
    """GET a SICONFI endpoint, with on-disk cache and retry/backoff."""
    if cache_file.exists() and not refresh:
        try:
            with open(cache_file, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            logger.warning("Corrupted cache file, re-fetching: %s", cache_file)

    last_error: Optional[str] = None
    for attempt in range(1, MAX_RETRIES + 1):
        limiter.wait()
        try:
            response = client.get(
                f"{BASE_SICONFI_URL}{endpoint}", params=params, timeout=REQUEST_TIMEOUT
            )
            if response.status_code == 200:
                data = response.json()
                _write_json_atomic(cache_file, data)
                return data
            if response.status_code == 404:
                # SICONFI returns 404 when the entity has no report for the period.
                data = {"items": [], "count": 0}
                _write_json_atomic(cache_file, data)
                return data
            if response.status_code == 400:
                # A 400 usually means "no report for this exact combination",
                # but it can also be a transient gateway error. Do not cache it
                # so a later retry can recover.
                last_error = "HTTP 400"
                if attempt == MAX_RETRIES:
                    return {"items": [], "count": 0}
                time.sleep(2.0 * attempt)
                continue
            last_error = f"HTTP {response.status_code}"
            if response.status_code == 429:
                time.sleep(10.0 * attempt)
                continue
        except Exception as exc:  # network timeouts, JSON errors, etc.
            last_error = str(exc)

        backoff = min(2.0 ** attempt, 30.0)
        logger.warning(
            "Request failed (%s) endpoint=%s params=%s attempt=%d/%d; retrying in %.0fs",
            last_error,
            endpoint,
            params,
            attempt,
            MAX_RETRIES,
            backoff,
        )
        time.sleep(backoff)

    logger.error("Giving up on %s params=%s after %d attempts", endpoint, params, MAX_RETRIES)
    return None


def fetch_all_ibge_municipalities(client: httpx.Client) -> List[Dict[str, Any]]:
    """Fetch the official list of 5,571 Brazilian municipalities from IBGE."""
    logger.info("Downloading official list of municipalities from IBGE...")
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.get(IBGE_MUNICIPIOS_URL, timeout=60.0)
            if response.status_code == 200:
                data = response.json()
                logger.info("Fetched %d municipalities from IBGE.", len(data))
                return data
        except Exception as exc:
            logger.warning("Attempt %d to fetch IBGE list failed: %s", attempt, exc)
            time.sleep(2.0)
    return []


def fetch_all_ibge_census_population(client: httpx.Client) -> Dict[str, int]:
    """Fetch official Census 2022 population counts for all municipalities."""
    logger.info("Downloading official Census 2022 population from IBGE...")
    population: Dict[str, int] = {}
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.get(IBGE_POP_URL, timeout=90.0)
            if response.status_code == 200:
                data = response.json()
                for item in data[0]["resultados"][0]["series"]:
                    code = str(item["localidade"]["id"])
                    try:
                        population[code] = int(item["serie"].get("2022", "0"))
                    except (TypeError, ValueError):
                        population[code] = 0
                logger.info("Mapped population for %d municipalities.", len(population))
                return population
        except Exception as exc:
            logger.warning("Attempt %d to fetch IBGE population failed: %s", attempt, exc)
            time.sleep(2.0)
    return population


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------


def classify_tier(population: int) -> str:
    if population >= 1_000_000:
        return "Metrópole"
    if population >= 100_000:
        return "Grande Porte"
    if population >= 50_000:
        return "Médio Porte"
    if population >= 20_000:
        return "Pequeno Porte II"
    return "Pequeno Porte I"


def extract_uf_and_region(m: Dict[str, Any]) -> Tuple[str, str]:
    """Safely extract UF abbreviation and macro-region from an IBGE object."""
    micro = m.get("microrregiao")
    if isinstance(micro, dict):
        meso = micro.get("mesorregiao")
        if isinstance(meso, dict):
            uf_obj = meso.get("UF")
            if isinstance(uf_obj, dict):
                uf = uf_obj.get("sigla", "BR")
                reg_obj = uf_obj.get("regiao")
                return uf, (reg_obj.get("nome", "Brasil") if reg_obj else "Brasil")

    imediata = m.get("regiao-imediata")
    if isinstance(imediata, dict):
        inter = imediata.get("regiao-intermediaria")
        if isinstance(inter, dict):
            uf_obj = inter.get("UF")
            if isinstance(uf_obj, dict):
                uf = uf_obj.get("sigla", "BR")
                reg_obj = uf_obj.get("regiao")
                return uf, (reg_obj.get("nome", "Brasil") if reg_obj else "Brasil")

    prefix = str(m.get("id", ""))[:2]
    uf_map = {
        "11": ("RO", "Norte"), "12": ("AC", "Norte"), "13": ("AM", "Norte"),
        "14": ("RR", "Norte"), "15": ("PA", "Norte"), "16": ("AP", "Norte"),
        "17": ("TO", "Norte"), "21": ("MA", "Nordeste"), "22": ("PI", "Nordeste"),
        "23": ("CE", "Nordeste"), "24": ("RN", "Nordeste"), "25": ("PB", "Nordeste"),
        "26": ("PE", "Nordeste"), "27": ("AL", "Nordeste"), "28": ("SE", "Nordeste"),
        "29": ("BA", "Nordeste"), "31": ("MG", "Sudeste"), "32": ("ES", "Sudeste"),
        "33": ("RJ", "Sudeste"), "35": ("SP", "Sudeste"), "41": ("PR", "Sul"),
        "42": ("SC", "Sul"), "43": ("RS", "Sul"), "50": ("MS", "Centro-Oeste"),
        "51": ("MT", "Centro-Oeste"), "52": ("GO", "Centro-Oeste"),
        "53": ("DF", "Centro-Oeste"),
    }
    return uf_map.get(prefix, ("BR", "Brasil"))


# ---------------------------------------------------------------------------
# SICONFI parsing
# ---------------------------------------------------------------------------


def _value(
    rows: List[Dict[str, Any]],
    cod_conta: str,
    coluna: str,
) -> Optional[float]:
    for row in rows:
        if row.get("cod_conta") == cod_conta and row.get("coluna") == coluna:
            try:
                return float(row["valor"])
            except (TypeError, ValueError):
                return None
    return None


def _sum_month_columns(rows: List[Dict[str, Any]], cod_conta: str) -> Optional[float]:
    """Sum the <MR>..<MR-11> monthly columns (used for annual RCL fallback)."""
    values = []
    for row in rows:
        if row.get("cod_conta") != cod_conta:
            continue
        col = str(row.get("coluna", ""))
        if col.startswith("<MR") or col == "Valor":
            try:
                values.append(float(row["valor"]))
            except (TypeError, ValueError):
                pass
    if not values:
        return None
    # If the endpoint already gives a single annual value under "Valor", don't
    # add it to a set of monthly columns.
    return sum(values)


def parse_rreo(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Parse RREO Anexo 01 (budget balance) and Anexo 02 (functions)."""
    items = data.get("items", [])
    if not items:
        return None

    a1 = [
        row
        for row in items
        if row.get("anexo") == "RREO-Anexo 01"
        and row.get("rotulo") in ("Padrão", "Total das Despesas Exceto Intra-Orçamentárias")
    ]
    if not a1:
        return None

    rev_col = "Até o Bimestre (c)"
    exp_col = "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)"

    total_revenue = _value(a1, "ReceitasExcetoIntraOrcamentarias", rev_col)
    if total_revenue is None:
        total_revenue = _value(a1, "TotalReceitas", rev_col)

    total_expense = _value(a1, "DespesasExcetoIntraOrcamentarias", exp_col)
    if total_expense is None:
        total_expense = _value(a1, "TotalDespesas", exp_col)

    transfers_current = _value(a1, "TransferenciasCorrentes", rev_col) or 0.0
    transfers_capital = _value(a1, "TransferenciasDeCapital", rev_col) or 0.0
    transfers = transfers_current + transfers_capital

    if not total_revenue or total_revenue <= 0:
        return None
    if total_expense is None or total_expense <= 0:
        return None

    transfers_pct = max(0.0, min(100.0, transfers / total_revenue * 100.0))
    own_pct = round(100.0 - transfers_pct, 2)
    transfers_pct = round(transfers_pct, 2)

    functions = {key: 0.0 for key in FUNCTION_CODES.values()}
    a2 = [
        row
        for row in items
        if row.get("anexo") == "RREO-Anexo 02"
        and row.get("rotulo") == "Total das Despesas Exceto Intra-Orçamentárias"
        and row.get("coluna") == "DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)"
    ]
    for row in a2:
        key = FUNCTION_LABELS.get(row.get("conta", ""))
        if key:
            try:
                functions[key] = float(row["valor"])
            except (TypeError, ValueError):
                pass

    # Annual RCL approximation from RREO Anexo 03, used only if RGF is absent.
    a3 = [row for row in items if row.get("anexo") == "RREO-Anexo 03"]
    annual_rcl = _sum_month_columns(a3, "RREO3ReceitaCorrenteLiquida")

    personnel_expense = (
        _value(a1, "PessoalEEncargosSociais", exp_col) or 0.0
    ) + (_value(a1, "PessoalEEncargosSociaisIntra", exp_col) or 0.0)

    return {
        "total_revenue": total_revenue,
        "total_expense": total_expense,
        "own_revenue_percentage": own_pct,
        "transfers_revenue_percentage": transfers_pct,
        "functions": functions,
        "annual_rcl": annual_rcl,
        "personnel_expense": personnel_expense if personnel_expense > 0 else None,
    }


def parse_rgf(data: Optional[Dict[str, Any]]) -> Optional[float]:
    """Return the official Despesa Total com Pessoal / RCL Ajustada percentage."""
    if not data:
        return None
    rows = [row for row in data.get("items", []) if row.get("anexo") == "RGF-Anexo 01"]
    if not rows:
        return None

    direct = _value(rows, "DespesaComPessoalTotal", "% sobre a RCL Ajustada")
    if direct is not None:
        return round(direct, 2)

    dtp = _value(rows, "DespesaComPessoalTotal", "Valor")
    rcl = _value(rows, "ReceitaCorrenteLiquidaAjustada", "Valor")
    if dtp is not None and rcl and rcl > 0:
        return round(dtp / rcl * 100.0, 2)
    return None


def parse_dca_functions(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Parse DCA Anexo I-E: total expense plus selected functions."""
    if not data:
        return None
    rows = [
        row
        for row in data.get("items", [])
        if row.get("coluna") == "Despesas Empenhadas"
    ]
    if not rows:
        return None

    functions = {key: 0.0 for key in FUNCTION_CODES.values()}
    function_sum = 0.0
    for row in rows:
        match = re.match(r"^(\d{2}) - ", str(row.get("conta", "")))
        if not match:
            continue
        key = FUNCTION_CODES.get(match.group(1))
        if not key:
            continue
        try:
            value = float(row["valor"])
        except (TypeError, ValueError):
            continue
        functions[key] = value
        function_sum += value

    total = None
    for row in rows:
        if row.get("conta") == "Despesas Exceto Intraorçamentárias":
            try:
                total = float(row["valor"])
            except (TypeError, ValueError):
                pass
            break

    if total is None:
        general = None
        intra = None
        for row in rows:
            if row.get("conta") == "Total Geral da Despesa":
                try:
                    general = float(row["valor"])
                except (TypeError, ValueError):
                    pass
            elif row.get("conta") == "Despesas Intraorçamentárias":
                try:
                    intra = float(row["valor"])
                except (TypeError, ValueError):
                    pass
        if general is not None and intra is not None:
            total = general - intra
        elif function_sum > 0:
            total = function_sum

    if not total or total <= 0:
        return None
    return {"total_expense": total, "functions": functions}


def _cache_path(cache_dir: Path, year: int, ibge_code: str, name: str) -> Path:
    return cache_dir / str(year) / ibge_code / f"{name}.json"


# Candidate reports, ordered from the most complete to the least complete.
# The closing report of the year is the only one with twelve months of
# revenue/expense; the others exist for municipalities that published late or
# only partially. Cache slugs stay stable so previous runs remain reusable.
RREO_COMPLETE = (
    ("RREO", 6, "rreo"),
    ("RREO Simplificado", 2, "rreo_simplificado"),
)
RREO_PARTIAL = (
    ("RREO", 5, "rreo_p5"),
    ("RREO", 4, "rreo_p4"),
    ("RREO", 3, "rreo_p3"),
    ("RREO", 2, "rreo_p2"),
    ("RREO", 1, "rreo_p1"),
    ("RREO Simplificado", 1, "rreo_simplificado_p1"),
)

RGF_CANDIDATES = (
    ("RGF", "Q", 3, "rgf"),
    ("RGF Simplificado", "S", 2, "rgf_simplificado"),
    ("RGF", "Q", 2, "rgf_q2"),
    ("RGF", "Q", 1, "rgf_q1"),
    ("RGF Simplificado", "S", 1, "rgf_simplificado_p1"),
)


def _read_cached(cache_dir: Path, year: int, ibge_code: str, name: str) -> Optional[Dict[str, Any]]:
    path = _cache_path(cache_dir, year, ibge_code, name)
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        return None
    return data if data.get("count", 0) > 0 else None


def cached_rreo(
    cache_dir: Path,
    ibge_code: str,
    year: int,
    candidates=RREO_COMPLETE + RREO_PARTIAL,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    for tipo, period, slug in candidates:
        data = _read_cached(cache_dir, year, ibge_code, slug)
        if data:
            return data, {"type": tipo, "period": period}
    return None, None


def cached_rgf(
    cache_dir: Path, ibge_code: str, year: int
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    for tipo, periodicidade, period, slug in RGF_CANDIDATES:
        data = _read_cached(cache_dir, year, ibge_code, slug)
        if data:
            return data, {"type": tipo, "periodicity": periodicidade, "period": period}
    return None, None


def fetch_rreo(
    client: httpx.Client,
    ibge_code: str,
    ente_id: int,
    esfera: Optional[str],
    year: int,
    limiter: RateLimiter,
    cache_dir: Path,
    refresh: bool,
    candidates=RREO_COMPLETE + RREO_PARTIAL,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    for tipo, period, slug in candidates:
        params: Dict[str, Any] = {
            "an_exercicio": year,
            "nr_periodo": period,
            "co_tipo_demonstrativo": tipo,
            "id_ente": ente_id,
        }
        if esfera:
            params["co_esfera"] = esfera
        data = request_json(
            client,
            "/rreo",
            params,
            _cache_path(cache_dir, year, ibge_code, slug),
            limiter,
            refresh,
        )
        if data is None:
            # Transient failure: stop searching (an older year would silently
            # replace the right one) and let the retry pass try again.
            return None, {"error": "request_failed", "year": year, "period": period}
        if data.get("count", 0) > 0:
            return data, {"type": tipo, "period": period}
    return None, None


def fetch_rgf(
    client: httpx.Client,
    ibge_code: str,
    ente_id: int,
    esfera: Optional[str],
    year: int,
    limiter: RateLimiter,
    cache_dir: Path,
    refresh: bool,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    for tipo, periodicidade, period, slug in RGF_CANDIDATES:
        params: Dict[str, Any] = {
            "an_exercicio": year,
            "in_periodicidade": periodicidade,
            "nr_periodo": period,
            "co_tipo_demonstrativo": tipo,
            "co_poder": "E",
            "id_ente": ente_id,
        }
        if esfera:
            params["co_esfera"] = esfera
        data = request_json(
            client,
            "/rgf",
            params,
            _cache_path(cache_dir, year, ibge_code, slug),
            limiter,
            refresh,
        )
        if data and data.get("count", 0) > 0:
            return data, {"type": tipo, "periodicity": periodicidade, "period": period}
    return None, None


def fetch_dca_functions(
    client: httpx.Client,
    ibge_code: str,
    ente_id: int,
    year: int,
    limiter: RateLimiter,
    cache_dir: Path,
    refresh: bool,
) -> Optional[Dict[str, Any]]:
    return request_json(
        client,
        "/dca",
        {
            "an_exercicio": year,
            "no_anexo": "DCA-Anexo I-E",
            "id_ente": ente_id,
        },
        _cache_path(cache_dir, year, ibge_code, "dca_funcoes"),
        limiter,
        refresh,
    )


# ---------------------------------------------------------------------------
# Synthetic fallback (kept only for entities with no SICONFI report)
# ---------------------------------------------------------------------------


def synthesize_city_record(
    ibge_code: str,
    city_name: str,
    uf: str,
    region: str,
    population: int,
    fiscal_year: int = 2025,
) -> Dict[str, Any]:
    """Deterministic fallback used only when SICONFI has no report."""
    pop = max(population, 1500)
    rng = random.Random(int(ibge_code))

    if pop >= 1_000_000:
        base_exp_per_capita = rng.uniform(7200.0, 8900.0)
        own_pct = round(rng.uniform(52.0, 65.0), 1)
        personnel_pct = round(rng.uniform(41.0, 51.0), 1)
    elif pop >= 100_000:
        base_exp_per_capita = rng.uniform(4600.0, 5800.0)
        own_pct = round(rng.uniform(38.0, 54.0), 1)
        personnel_pct = round(rng.uniform(44.0, 52.5), 1)
    elif pop >= 50_000:
        base_exp_per_capita = rng.uniform(4200.0, 5200.0)
        own_pct = round(rng.uniform(28.0, 42.0), 1)
        personnel_pct = round(rng.uniform(45.0, 53.0), 1)
    elif pop >= 20_000:
        base_exp_per_capita = rng.uniform(4100.0, 4900.0)
        own_pct = round(rng.uniform(18.0, 32.0), 1)
        personnel_pct = round(rng.uniform(46.0, 53.5), 1)
    else:
        base_exp_per_capita = rng.uniform(4300.0, 5600.0)
        own_pct = round(rng.uniform(8.0, 22.0), 1)
        personnel_pct = round(rng.uniform(45.5, 53.8), 1)

    transfers_pct = round(100.0 - own_pct, 1)
    total_expense = round(base_exp_per_capita * pop, 2)
    total_revenue = round(total_expense * rng.uniform(0.99, 1.04), 2)
    total_per_capita = round(total_expense / pop, 1)

    health = round(total_per_capita * rng.uniform(0.20, 0.28), 1)
    education = round(total_per_capita * rng.uniform(0.24, 0.32), 1)
    urbanism = round(total_per_capita * rng.uniform(0.08, 0.16), 1)
    administration = round(total_per_capita * rng.uniform(0.06, 0.12), 1)
    legislative = round(total_per_capita * rng.uniform(0.015, 0.035), 1)

    trend = [
        {
            "year": fiscal_year - 4,
            "total_spent_per_capita": round(total_per_capita * 0.81, 1),
            "health_per_capita": round(health * 0.78, 1),
        },
        {
            "year": fiscal_year - 3,
            "total_spent_per_capita": round(total_per_capita * 0.87, 1),
            "health_per_capita": round(health * 0.84, 1),
        },
        {
            "year": fiscal_year - 2,
            "total_spent_per_capita": round(total_per_capita * 0.93, 1),
            "health_per_capita": round(health * 0.90, 1),
        },
        {
            "year": fiscal_year - 1,
            "total_spent_per_capita": round(total_per_capita * 0.98, 1),
            "health_per_capita": round(health * 0.96, 1),
        },
        {
            "year": fiscal_year,
            "total_spent_per_capita": total_per_capita,
            "health_per_capita": health,
        },
    ]

    return {
        "ibge_code": str(ibge_code),
        "city_name": city_name,
        "uf": uf,
        "population": pop,
        "fiscal_year": fiscal_year,
        "data_source": "synthetic",
        "summary": {
            "total_revenue": total_revenue,
            "total_expense": total_expense,
            "own_revenue_percentage": own_pct,
            "transfers_revenue_percentage": transfers_pct,
            "personnel_expense_percentage_rcl": personnel_pct,
        },
        "per_capita_breakdown": {
            "health": health,
            "education": education,
            "urbanism": urbanism,
            "administration": administration,
            "legislative": legislative,
        },
        "historical_trend": trend,
    }


# ---------------------------------------------------------------------------
# Per-city extraction
# ---------------------------------------------------------------------------


def extract_city(
    client: httpx.Client,
    municipality: Dict[str, Any],
    population: int,
    fallback_population: int,
    target_year: int,
    history_start: int,
    limiter: RateLimiter,
    cache_dir: Path,
    refresh: bool,
    skip_network: bool,
) -> Dict[str, Any]:
    ibge_code = str(municipality["id"])
    city_name = municipality["nome"]
    uf, region = extract_uf_and_region(municipality)
    population = population or fallback_population or 25000

    is_df = ibge_code == DF_IBGE_CODE
    ente_id = DF_SICONFI_ID if is_df else int(ibge_code)
    esfera = "E" if is_df else "M"

    # Latest official report wins: the closing report of the target year, then
    # the closing report of the two previous years, and only then a partial
    # report of the target year (e.g. an entity that published up to the 5th
    # bimester). Synthetic values remain the absolute last resort.
    year_candidates = [target_year, target_year - 1, target_year - 2]
    rreo_data = None
    rreo_info: Optional[Dict[str, Any]] = None
    data_year = target_year
    request_failed = False

    for candidate_year in year_candidates:
        if skip_network:
            candidate, info = cached_rreo(
                cache_dir, ibge_code, candidate_year, RREO_COMPLETE
            )
        else:
            candidate, info = fetch_rreo(
                client,
                ibge_code,
                ente_id,
                esfera,
                candidate_year,
                limiter,
                cache_dir,
                refresh,
                RREO_COMPLETE,
            )
        if info and info.get("error"):
            request_failed = True
            break
        if candidate:
            rreo_data, rreo_info, data_year = candidate, info, candidate_year
            break

    if not rreo_data and not request_failed:
        if skip_network:
            rreo_data, rreo_info = cached_rreo(
                cache_dir, ibge_code, target_year, RREO_PARTIAL
            )
        else:
            rreo_data, rreo_info = fetch_rreo(
                client,
                ibge_code,
                ente_id,
                esfera,
                target_year,
                limiter,
                cache_dir,
                refresh,
                RREO_PARTIAL,
            )
        if rreo_info and rreo_info.get("error"):
            request_failed = True
            rreo_data, rreo_info = None, None
        data_year = target_year

    rgf_data: Optional[Dict[str, Any]] = None
    rgf_info: Optional[Dict[str, Any]] = None
    if rreo_data:
        if skip_network:
            rgf_data, rgf_info = cached_rgf(cache_dir, ibge_code, data_year)
        else:
            rgf_data, rgf_info = fetch_rgf(
                client, ibge_code, ente_id, esfera, data_year, limiter, cache_dir, refresh
            )

    parsed = parse_rreo(rreo_data) if rreo_data else None
    personnel_pct = parse_rgf(rgf_data)

    if not parsed:
        record = synthesize_city_record(
            ibge_code=ibge_code,
            city_name=city_name,
            uf=uf,
            region=region,
            population=population,
            fiscal_year=target_year,
        )
        record["extraction"] = {
            "source": "synthetic",
            "reason": (
                "SICONFI request failed after retries"
                if request_failed
                else (
                    f"No RREO published for {target_year}, {target_year - 1} "
                    f"or {target_year - 2}"
                )
            ),
            "target_year": target_year,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        return record

    if personnel_pct is None:
        if parsed.get("personnel_expense") and parsed.get("annual_rcl"):
            personnel_pct = round(
                parsed["personnel_expense"] / parsed["annual_rcl"] * 100.0, 2
            )
            personnel_source = "derived_from_rreo"
        else:
            personnel_pct = 0.0
            personnel_source = "unavailable"
    else:
        personnel_source = "rgf_anexo_01"

    functions = parsed["functions"]
    per_capita = {
        key: round(value / population, 2) if population else 0.0
        for key, value in functions.items()
    }

    historical_trend: List[Dict[str, Any]] = []

    # Whether the main figures cover twelve months or only the bimester
    # accumulated so far (RREO publishes "Até o Bimestre" columns).
    rreo_info = rreo_info or {}
    is_complete = (
        rreo_info.get("type") == "RREO" and rreo_info.get("period") == 6
    ) or (
        rreo_info.get("type") == "RREO Simplificado" and rreo_info.get("period") == 2
    )

    # Real history from DCA Anexo I-E for the previous years.
    for year in range(history_start, data_year):
        if skip_network:
            path = _cache_path(cache_dir, year, ibge_code, "dca_funcoes")
            if not path.exists():
                continue
            with open(path, "r", encoding="utf-8") as fh:
                dca_data = json.load(fh)
        else:
            dca_data = fetch_dca_functions(
                client, ibge_code, ente_id, year, limiter, cache_dir, refresh
            )
        dca = parse_dca_functions(dca_data)
        if not dca:
            continue
        historical_trend.append(
            {
                "year": year,
                "total_spent_per_capita": round(dca["total_expense"] / population, 2),
                "health_per_capita": round(dca["functions"]["health"] / population, 2),
            }
        )

    historical_trend.append(
        {
            "year": data_year,
            "total_spent_per_capita": round(parsed["total_expense"] / population, 2),
            "health_per_capita": per_capita["health"],
        }
    )
    historical_trend.sort(key=lambda item: item["year"])

    return {
        "ibge_code": ibge_code,
        "city_name": city_name,
        "uf": uf,
        "population": population,
        "fiscal_year": data_year,
        "data_source": (
            "siconfi"
            if (is_complete and personnel_source == "rgf_anexo_01")
            else "siconfi_partial"
        ),
        "summary": {
            "total_revenue": round(parsed["total_revenue"], 2),
            "total_expense": round(parsed["total_expense"], 2),
            "own_revenue_percentage": parsed["own_revenue_percentage"],
            "transfers_revenue_percentage": parsed["transfers_revenue_percentage"],
            "personnel_expense_percentage_rcl": round(personnel_pct, 2),
        },
        "per_capita_breakdown": per_capita,
        "historical_trend": historical_trend,
        "extraction": {
            "source": "siconfi",
            "requested_year": target_year,
            "data_year": data_year,
            "rreo_type": rreo_info.get("type"),
            "rreo_period": rreo_info.get("period"),
            "rreo_complete": is_complete,
            "personnel_source": personnel_source,
            "rgf_period": (rgf_info or {}).get("period"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract and normalize real SICONFI & IBGE municipal data."
    )
    parser.add_argument("--output-dir", default="public/data/cities")
    parser.add_argument("--parquet-path", default="public/data/brazil_summary.parquet")
    parser.add_argument("--index-path", default="public/data/cities_index.json")
    parser.add_argument("--target-year", type=int, default=2025)
    parser.add_argument(
        "--history-start",
        type=int,
        default=2021,
        help="First year of the historical series (default: 2021)",
    )
    parser.add_argument(
        "--no-history",
        action="store_true",
        help="Skip DCA historical extraction (only current year)",
    )
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument(
        "--rate",
        type=float,
        default=4.0,
        help="Global SICONFI requests per second (default: 4.0)",
    )
    parser.add_argument(
        "--cache-dir", default="pipeline/cache", help="Raw SICONFI response cache"
    )
    parser.add_argument("--refresh", action="store_true", help="Ignore the cache")
    parser.add_argument(
        "--skip-network",
        action="store_true",
        help="Rebuild outputs from cached responses only",
    )
    parser.add_argument(
        "--limit", type=int, default=0, help="Process only the first N municipalities"
    )
    parser.add_argument(
        "--only",
        default="",
        help="Comma-separated IBGE codes to process (useful for smoke tests)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    Path(args.parquet_path).parent.mkdir(parents=True, exist_ok=True)
    Path(args.index_path).parent.mkdir(parents=True, exist_ok=True)
    cache_dir = Path(args.cache_dir)
    history_start = args.target_year if args.no_history else args.history_start

    start_time = time.time()
    logger.info(
        "Starting SICONFI extraction: year=%d history=%d..%d workers=%d rate=%.1f req/s",
        args.target_year,
        history_start,
        args.target_year,
        args.workers,
        args.rate,
    )

    with httpx.Client(
        headers={"User-Agent": "OrcamentoCidadao-SICONFI-Sync/2.0"},
        follow_redirects=True,
    ) as client:
        municipalities = fetch_all_ibge_municipalities(client)
        if not municipalities:
            logger.error("Failed to fetch IBGE municipalities. Aborting.")
            sys.exit(1)

        population_map = fetch_all_ibge_census_population(client)

        # SICONFI's entity table is a useful fallback for missing IBGE population.
        entes_population: Dict[str, int] = {}
        try:
            response = client.get(
                f"{BASE_SICONFI_URL}/entes", params={"co_esfera": "M"}, timeout=60.0
            )
            if response.status_code == 200:
                for ente in response.json().get("items", []):
                    code = str(ente.get("cod_ibge"))
                    if ente.get("populacao"):
                        entes_population[code] = int(ente["populacao"])
        except Exception as exc:
            logger.warning("Could not load SICONFI entity table: %s", exc)

    only_codes = {code.strip() for code in args.only.split(",") if code.strip()}
    if only_codes:
        municipalities = [m for m in municipalities if str(m["id"]) in only_codes]
    if args.limit and args.limit > 0:
        municipalities = municipalities[: args.limit]

    logger.info("Processing %d municipalities...", len(municipalities))

    limiter = RateLimiter(args.rate)
    results: Dict[int, Dict[str, Any]] = {}
    counters = {"real": 0, "synthetic": 0}
    counters_lock = threading.Lock()
    started = time.time()

    def worker(index: int, municipality: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        ibge_code = str(municipality["id"])
        record = extract_city(
            client=client,
            municipality=municipality,
            population=population_map.get(ibge_code, 0),
            fallback_population=entes_population.get(ibge_code, 0),
            target_year=args.target_year,
            history_start=history_start,
            limiter=limiter,
            cache_dir=cache_dir,
            refresh=args.refresh,
            skip_network=args.skip_network,
        )
        return index, record

    with httpx.Client(
        headers={"User-Agent": "OrcamentoCidadao-SICONFI-Sync/2.0"},
        follow_redirects=True,
    ) as client:
        with ThreadPoolExecutor(max_workers=max(args.workers, 1)) as executor:
            futures = {
                executor.submit(worker, index, municipality): index
                for index, municipality in enumerate(municipalities)
            }
            for completed, future in enumerate(as_completed(futures), start=1):
                try:
                    index, record = future.result()
                except Exception as exc:
                    index = futures[future]
                    municipality = municipalities[index]
                    logger.exception(
                        "Unexpected failure for %s: %s", municipality.get("id"), exc
                    )
                    record = synthesize_city_record(
                        ibge_code=str(municipality["id"]),
                        city_name=municipality["nome"],
                        uf=extract_uf_and_region(municipality)[0],
                        region=extract_uf_and_region(municipality)[1],
                        population=population_map.get(str(municipality["id"]), 25000),
                        fiscal_year=args.target_year,
                    )
                results[index] = record

                with counters_lock:
                    if record.get("data_source") == "synthetic":
                        counters["synthetic"] += 1
                    else:
                        counters["real"] += 1

                if completed % 50 == 0 or completed == len(municipalities):
                    elapsed = time.time() - started
                    rate = completed / elapsed if elapsed else 0.0
                    remaining = len(municipalities) - completed
                    eta = remaining / rate if rate else 0.0
                    logger.info(
                        "Progress %d/%d (%.1f%%) | real=%d synthetic=%d | %.2f city/s | ETA %s",
                        completed,
                        len(municipalities),
                        completed / len(municipalities) * 100.0,
                        counters["real"],
                        counters["synthetic"],
                        rate,
                        time.strftime("%H:%M:%S", time.gmtime(eta)),
                    )

        # Second pass: recover transient failures (throttling/timeouts) that
        # caused a city to fall back to synthetic data. Failed requests were
        # not cached, so this pass only re-fetches what is missing.
        retry_indices = [
            index
            for index, record in results.items()
            if record.get("data_source") == "synthetic"
            or (
                record.get("data_source") == "siconfi_partial"
                and record.get("extraction", {}).get("personnel_source")
                == "unavailable"
            )
        ]
        if retry_indices:
            logger.info(
                "Retrying %d records that fell back or lack personnel data...",
                len(retry_indices),
            )
            slow_limiter = RateLimiter(min(args.rate, 2.0))
            for position, index in enumerate(retry_indices, start=1):
                municipality = municipalities[index]
                try:
                    retried = extract_city(
                        client=client,
                        municipality=municipality,
                        population=population_map.get(str(municipality["id"]), 0),
                        fallback_population=entes_population.get(
                            str(municipality["id"]), 0
                        ),
                        target_year=args.target_year,
                        history_start=history_start,
                        limiter=slow_limiter,
                        cache_dir=cache_dir,
                        refresh=False,
                        skip_network=args.skip_network,
                    )
                    results[index] = retried
                    logger.info(
                        "Retry %d/%d: %s (%s) -> %s",
                        position,
                        len(retry_indices),
                        retried.get("city_name"),
                        retried.get("ibge_code"),
                        retried.get("data_source"),
                    )
                except Exception as exc:
                    logger.warning(
                        "Retry failed for %s: %s", municipality.get("id"), exc
                    )

            counters["real"] = sum(
                1
                for record in results.values()
                if record.get("data_source") != "synthetic"
            )
            counters["synthetic"] = len(results) - counters["real"]
            logger.info(
                "After retry: real=%d synthetic=%d",
                counters["real"],
                counters["synthetic"],
            )

    ordered_records = [results[index] for index in range(len(municipalities))]

    logger.info("Writing %d individual city JSON files...", len(ordered_records))
    for record in ordered_records:
        city_file = output_dir / f"{record['ibge_code']}.json"
        _write_json_atomic(city_file, record)

    municipality_by_code = {str(m["id"]): m for m in municipalities}
    search_index: List[Dict[str, Any]] = []
    flat_rows: List[Dict[str, Any]] = []
    for record in ordered_records:
        municipality = municipality_by_code.get(record["ibge_code"])
        tier = classify_tier(record["population"])
        region = extract_uf_and_region(municipality)[1] if municipality else "Brasil"

        search_index.append(
            {
                "ibge_code": record["ibge_code"],
                "city_name": record["city_name"],
                "uf": record["uf"],
                "region": region,
                "tier": tier,
                "population": record["population"],
                "total_expense": record["summary"]["total_expense"],
                "personnel_expense_percentage_rcl": record["summary"][
                    "personnel_expense_percentage_rcl"
                ],
                "data_source": record.get("data_source", "synthetic"),
            }
        )
        flat_rows.append(
            {
                "ibge_code": record["ibge_code"],
                "city_name": record["city_name"],
                "uf": record["uf"],
                "region": region,
                "tier": tier,
                "population": record["population"],
                "fiscal_year": record["fiscal_year"],
                "data_source": record.get("data_source", "synthetic"),
                "total_revenue": record["summary"]["total_revenue"],
                "total_expense": record["summary"]["total_expense"],
                "own_revenue_percentage": record["summary"]["own_revenue_percentage"],
                "transfers_revenue_percentage": record["summary"][
                    "transfers_revenue_percentage"
                ],
                "personnel_expense_percentage_rcl": record["summary"][
                    "personnel_expense_percentage_rcl"
                ],
                "health_per_capita": record["per_capita_breakdown"]["health"],
                "education_per_capita": record["per_capita_breakdown"]["education"],
                "urbanism_per_capita": record["per_capita_breakdown"]["urbanism"],
                "administration_per_capita": record["per_capita_breakdown"][
                    "administration"
                ],
                "legislative_per_capita": record["per_capita_breakdown"]["legislative"],
            }
        )

    _write_json_atomic(Path(args.index_path), search_index)

    logger.info("Writing Parquet + JSON national summary...")
    dataframe = pd.DataFrame(flat_rows)
    dataframe.to_parquet(
        args.parquet_path, engine="pyarrow", compression="zstd", index=False
    )
    json_summary_path = os.path.splitext(args.parquet_path)[0] + ".json"
    dataframe.to_json(json_summary_path, orient="records", indent=2, force_ascii=False)

    source_counts = {"siconfi": 0, "siconfi_partial": 0, "synthetic": 0}
    year_counts: Dict[str, int] = {}
    synthetic_cities: List[Dict[str, str]] = []
    for record in ordered_records:
        source = record.get("data_source", "synthetic")
        source_counts[source] = source_counts.get(source, 0) + 1
        year_key = str(record.get("fiscal_year"))
        year_counts[year_key] = year_counts.get(year_key, 0) + 1
        if source == "synthetic":
            synthetic_cities.append(
                {
                    "ibge_code": record["ibge_code"],
                    "city_name": record["city_name"],
                    "uf": record["uf"],
                }
            )

    metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target_year": args.target_year,
        "history_start": history_start,
        "municipalities": len(ordered_records),
        "real_records": counters["real"],
        "synthetic_records": counters["synthetic"],
        "source_counts": source_counts,
        "records_by_data_year": dict(sorted(year_counts.items())),
        "synthetic_cities": sorted(
            synthetic_cities, key=lambda item: (item["uf"], item["city_name"])
        ),
        "sources": {
            "municipalities": IBGE_MUNICIPIOS_URL,
            "population": "IBGE Census 2022 (Agregado 4714)",
            "budget": "SICONFI RREO Anexo 01 + Anexo 02",
            "personnel": "SICONFI RGF Anexo 01",
            "history": "SICONFI DCA Anexo I-E",
        },
    }
    _write_json_atomic(Path(args.parquet_path).parent / "extraction_metadata.json", metadata)

    elapsed = time.time() - start_time
    total_population = sum(record["population"] for record in ordered_records)
    total_budget = sum(record["summary"]["total_expense"] for record in ordered_records)

    logger.info(
        "EXTRACTION COMPLETE in %.1f minutes\n"
        "  - Municipalities: %d\n"
        "  - Real SICONFI records: %d\n"
        "  - Synthetic fallbacks: %d\n"
        "  - Total population: %s\n"
        "  - Total municipal budget: R$ %s\n"
        "  - Parquet: %s (%.1f KB)\n"
        "  - Index: %s (%.1f KB)",
        elapsed / 60.0,
        len(ordered_records),
        counters["real"],
        counters["synthetic"],
        f"{total_population:,}".replace(",", "."),
        f"{total_budget / 1_000_000_000:,.1f} bilhões",
        args.parquet_path,
        os.path.getsize(args.parquet_path) / 1024,
        args.index_path,
        os.path.getsize(args.index_path) / 1024,
    )


if __name__ == "__main__":
    main()
