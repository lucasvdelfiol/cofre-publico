#!/usr/bin/env python3
"""QA rápido das métricas de educação: cobertura e coerência com o RREO.

Roda em cima do cache local (``pipeline/cache``) e responde:

* quantos municípios têm a métrica de pessoal depois da checagem de sanidade;
* como se distribui o percentual de pessoal (percentis);
* quão perto o total de Educação reconstruído da MSC fica do RREO Anexo 02.
"""

import glob
import json
import statistics
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from education_data import _rreo_education_total  # noqa: E402

cache = Path("pipeline/cache")
shares, diffs = [], []
kept = dropped = empty = no_rreo = 0

for path in sorted(glob.glob(str(cache / "msc" / "*" / "*.json"))):
    data = json.load(open(path))
    if data.get("empty") or data.get("personnel_share_pct") is None:
        empty += 1
        continue
    code = Path(path).stem.replace("_mscc", "")
    year = int(data["year"])
    reference = _rreo_education_total(cache, code, year)
    if reference is None:
        no_rreo += 1
    elif data["education_total"] < 0.5 * reference:
        dropped += 1
        continue
    kept += 1
    shares.append(data["personnel_share_pct"])
    if reference:
        diffs.append(abs(data["education_total"] - reference) / reference * 100)

shares.sort()
print(f"resumos no cache: {kept + dropped + empty + no_rreo}")
print(f"  sem métrica (vazio/erro): {empty}")
print(f"  descartados pela checagem de sanidade (<50% do RREO): {dropped}")
print(f"  sem RREO no cache para comparar: {no_rreo}")
print(f"  mantidos: {kept}")

if shares:
    pct = lambda q: shares[min(len(shares) - 1, int(len(shares) * q))]
    print(
        "share pct: min %.1f | p10 %.1f | mediana %.1f | p90 %.1f | max %.1f"
        % (shares[0], pct(0.10), statistics.median(shares), pct(0.90), shares[-1])
    )
    below = sum(1 for s in shares if s < 30)
    print(f"cidades com share < 30%: {below} ({below / len(shares) * 100:.1f}%)")
    at_zero = sum(1 for s in shares if s <= 0.01)
    at_full = sum(1 for s in shares if s >= 99.99)
    print(f"cidades em 0%: {at_zero} | em 100%: {at_full}")

if diffs:
    diffs.sort()
    pct = lambda q: diffs[min(len(diffs) - 1, int(len(diffs) * q))]
    print(
        "diferença MSC vs RREO: mediana %.2f%% | p90 %.2f%% | p99 %.2f%% | max %.2f%%"
        % (statistics.median(diffs), pct(0.90), pct(0.99), diffs[-1])
    )
