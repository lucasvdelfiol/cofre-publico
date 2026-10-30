# Cofre Público 🇧🇷

> **Plataforma cívica open-source e 100% gratuita** para exploração, normalização e visualização dos gastos públicos municipais de todas as cidades brasileiras, inspirada no design e usabilidade de plataformas como *Politicômetro*.
>
> O orçamento das cidades brasileiras em linguagem simples.

---

## 🏛️ Visão do Projeto

A contabilidade pública brasileira é riquíssima em dados abertos (via **SICONFI / Tesouro Nacional** e **IBGE**), mas é inacessível para a maioria dos cidadãos devido a jargões técnicos herméticos (*"Dotação Atualizada"*, *"Despesa Empenhada"*, *"Restos a Pagar"*, *"RCL"*).

O **Cofre Público** resolve esse desafio através de:
1. **Linguagem Cidadã:** Tradução automática e contextual de termos contábeis para o vocabulário cotidiano.
2. **Métricas Per Capita:** Comparações justas entre cidades de diferentes portes populacionais.
3. **Termômetro da LRF:** Visualização intuitiva da folha de pagamento em relação aos limites legais da Lei de Responsabilidade Fiscal.
4. **Arquitetura Zero-Cost (Jamstack):** Sem servidores backend ativos, sem bancos de dados pagos e sem custos recorrentes de hospedagem.

---

## ⚡ Arquitetura do Sistema (Zero-Cost / Jamstack)

```text
[APIs Públicas: SICONFI / IBGE / STN]
                 │
                 ▼  (Execução mensal local: Python ETL, commitada no Git)
   [Consolidação e Compressão de Dados]
         ├── public/data/cities/{ibge_code}.json   (5.571 arquivos estáticos ~5 KB)
         ├── public/data/cities_index.json          (Índice rápido para busca instantânea)
         ├── public/data/brazil_summary.parquet     (~300 KB - Tabela nacional compactada)
         └── public/data/extraction_metadata.json   (Contagens, fontes e ano de referência)
                 │
                 ▼  (Commit automatizado no Git & Deploy Estático)
      [Cloudflare Pages / Vercel]
                 │
                 ▼  (Consultas analíticas em memória no navegador)
            [Aplicação Web Next.js (SSG)]
```

### Fontes de Dados

| Indicador | Fonte oficial | Relatório |
| --- | --- | --- |
| Lista de municípios e população | IBGE | Localidades + Censo 2022 (Agregado 4714) |
| Receita total, despesa total, repasses e autonomia | SICONFI / Tesouro Nacional | RREO Anexo 01 (Balanço Orçamentário) |
| Gastos por função (saúde, educação, urbanismo, administração, legislativo) | SICONFI / Tesouro Nacional | RREO Anexo 02 (Despesa por Função) |
| Despesa com pessoal / RCL | SICONFI / Tesouro Nacional | RGF Anexo 01 (Despesa com Pessoal) |
| Série histórica de 5 anos | SICONFI / Tesouro Nacional | DCA Anexo I-E (Despesa por Função) |

Municípios que não publicaram os relatórios obrigatórios no SICONFI recebem um
registro **sintético** determinístico, explicitamente identificado pelo campo
`data_source: "synthetic"`. Nenhum registro real é misturado com valores
simulados: o perfil da cidade mostra a origem dos dados no cabeçalho.

### Decisões de Engenharia
* **Orquestração:** Pipeline Python com cache em disco e retomada automática.
* **Resiliência:** cache por resposta (`pipeline/cache/`), retries com backoff e
  uma segunda passada para recuperar falhas transitórias de rede/throttling.
* **Armazenamento Estático:**
  * Arquivos JSON individuais por município (`public/data/cities/{ibge_code}.json`) para carregamento instantâneo sob demanda (<10 KB).
  * Arquivo Apache Parquet consolidado (`public/data/brazil_summary.parquet`) para análises SQL/notebooks e rankings offline; o navegador consome a versão JSON (`brazil_summary.json`) baixada sob demanda pelo explorador.
* **Orçamento de payload:** a home não embute a base nacional no HTML — ela renderiza KPIs agregados no build e o explorador baixa `brazil_summary.json` (~380 KB gzip) apenas no cliente, paginando 12 cartões por vez. O índice de busca (~150 KB gzip) só é baixado quando o usuário foca o campo de busca.
* **Hospedagem:** Cloudflare Pages ou Vercel (tráfego ilimitado, cache edge global, custo R$ 0,00).
* **Frontend:** Next.js (Static Site Generation / Export Estático) + Tailwind CSS + Lucide Icons.

---

## 📊 Estrutura de Dados (Schema JSON por Município)

Cada município possui um arquivo JSON estático conforme a especificação:

```json
{
  "ibge_code": "3518800",
  "city_name": "Guarulhos",
  "uf": "SP",
  "population": 1291771,
  "fiscal_year": 2025,
  "data_source": "siconfi",
  "summary": {
    "total_revenue": 6200000000.0,
    "total_expense": 5980000000.0,
    "own_revenue_percentage": 42.5,
    "transfers_revenue_percentage": 57.5,
    "personnel_expense_percentage_rcl": 48.2
  },
  "per_capita_breakdown": {
    "health": 1240.5,
    "education": 1110.2,
    "urbanism": 450.3,
    "administration": 380.0,
    "legislative": 85.0
  },
  "historical_trend": [
    { "year": 2021, "total_spent_per_capita": 3749.7, "health_per_capita": 967.6 },
    { "year": 2022, "total_spent_per_capita": 4027.5, "health_per_capita": 1042.0 },
    { "year": 2023, "total_spent_per_capita": 4305.2, "health_per_capita": 1116.5 },
    { "year": 2024, "total_spent_per_capita": 4536.7, "health_per_capita": 1190.9 },
    { "year": 2025, "total_spent_per_capita": 4629.3, "health_per_capita": 1240.5 }
  ]
}
```

---

## 🎯 Funcionalidades Principais

### 1. Raio-X Municipal (`/cidade/[ibgeCode]`)
* Busca preditiva instantânea por nome da cidade ou UF.
* **KPIs Estratégicos:**
  * **Orçamento Efetivo:** Arrecadação realizada vs. Despesa efetivamente liquidada/paga.
  * **Índice de Autonomia:** Arrecadação própria (IPTU, ISS, taxas) vs. Dependência de repasses (FPM, ICMS, Fundeb).
  * **Gastos Setoriais por Habitante:** Valores anuais por munícipe em Saúde Básica, Educação, Urbanismo, Administração e Câmara de Vereadores.
  * **Termômetro da LRF:** Manômetro visual do gasto com pessoal sobre a Receita Corrente Líquida (RCL):
    * 🟢 *Normal* (< 48,6%)
    * 🟡 *Alerta* (48,6% – 51,3%)
    * 🟠 *Prudencial* (51,3% – 54,0%)
    * 🔴 *Crítico / Ilegal* (> 54,0%)
* **Evolução Histórica (5 anos):** Gráfico interativo com curva de gastos gerais e de saúde.

### 2. Comparador Lado a Lado (`/comparar`)
* Seleção simultânea de 2 a 3 municípios (ex: Guarulhos vs. Campinas vs. Curitiba).
* Gráficos comparativos agrupados para avaliar prioridades orçamentárias entre cidades semelhantes.

### 3. Glossário Cidadão (`/dicionario`)
* Dicionário completo e interativo traduzindo:
  * *Dotação Atualizada* $\rightarrow$ "Orçamento Planejado"
  * *Despesa Empenhada* $\rightarrow$ "Gasto Reservado/Contratado"
  * *Despesa Liquidada / Paga* $\rightarrow$ "Gasto Efetivamente Entregue e Pago"
  * *Restos a Pagar* $\rightarrow$ "Contas Pendentes de Anos Anteriores"
  * *Receita Corrente Líquida (RCL)* $\rightarrow$ "Arrecadação Livre Disponível"
* Anotações de pisos constitucionais obrigatórios (25% Educação, 15% Saúde).

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js 18+ e npm
* Python 3.9+

### 1. Instalar Dependências e Executar a Aplicação Web
```bash
# Instalar pacotes do frontend
npm install

# Iniciar servidor de desenvolvimento local
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### 2. Executar o Pipeline de Extração ETL (Python)
```bash
# Criar e ativar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências de dados
pip install -r pipeline/requirements.txt

# Extração nacional completa (5.571 municípios, RREO + RGF + DCA)
python pipeline/extract_siconfi.py --target-year 2025 --history-start 2021 --rate 4 --workers 8

# Apenas alguns municípios (smoke test)
python pipeline/extract_siconfi.py --only 3550308,3304557,5300108

# Reaproveitar respostas já baixadas (pipeline/cache/), sem nova coleta
python pipeline/extract_siconfi.py --skip-network

# Ignorar o cache e forçar nova coleta
python pipeline/extract_siconfi.py --refresh
```

**Tempo de execução:** uma execução completa a frio leva cerca de **2h30–3h**
(≈0,6 município/s), porque o Tesouro Nacional limita a taxa de requisições.
Com o cache preenchido (execuções mensais), o pipeline termina em poucos
minutos e só busca os relatórios que ainda faltam.

**Resiliência:** cada resposta bruta é gravada em `pipeline/cache/` (ignorado
pelo Git). Em caso de falha de rede ou *throttling*, o pipeline faz retries com
*backoff* e uma segunda passada automática nos municípios que caíram para o
registro sintético.

**Saídas geradas:**
* `public/data/cities/{ibge_code}.json` — um arquivo por município
* `public/data/cities_index.json` — índice de busca
* `public/data/brazil_summary.parquet` e `.json` — consolidado nacional
* `public/data/extraction_metadata.json` — contagens `siconfi`,
  `siconfi_partial` e `synthetic`, taxa de sucesso e ano de referência

### 3. Gerar a Build Estática (SSG / Jamstack)
```bash
npm run build
```
O build estático pronto para deploy será gerado no diretório `out/`.

Para simular o subcaminho do GitHub Pages localmente:

```bash
NEXT_PUBLIC_BASE_PATH=/cofre-publico npm run build
npx serve out   # abra http://localhost:3000/cofre-publico/
```

---

## 🚀 Deploy (GitHub Pages)

O site é publicado automaticamente pelo workflow `.github/workflows/deploy-pages.yml`
a cada push em `main`:

1. `npm ci` + `npm run build` com `NEXT_PUBLIC_BASE_PATH=/cofre-publico`
2. upload do `out/` como artefato do Pages
3. publicação em `https://lucasvdelfiol.github.io/cofre-publico/`

Configuração necessária (uma vez): **Settings → Pages → Source: GitHub Actions**.

Como o site fica em um *project page* (subcaminho `/cofre-publico/`), todo
`fetch` de arquivo em `public/` usa o helper `src/lib/paths.ts`, que prefixa o
`basePath`. Se um dia o repositório virar `lucasvdelfiol.github.io`, basta
remover a env `NEXT_PUBLIC_BASE_PATH` do workflow.

---

## 🔄 Atualização de Dados (execução local)

A atualização mensal é feita **localmente** e commitada no repositório:

```bash
source venv/bin/activate

# 1. Coleta (aproveita pipeline/cache/, só busca o que mudou)
python pipeline/extract_siconfi.py --target-year 2026 --rate 4 --workers 8

# 2. Conferir
cat public/data/extraction_metadata.json

# 3. Commit
git add public/data/ && git commit -m "chore(data): siconfi sync $(date +%Y-%m)" && git push
```

Por que não no GitHub Actions: um job em runner hospedado é limitado a **6h**,
o cache de respostas do Actions é apagado após **7 dias sem uso** (portanto
nunca sobrevive de um mês para o outro) e o cache só é salvo quando o job
termina com sucesso — ou seja, um timeout no fim desperdiça a execução inteira.
O workflow `.github/workflows/sync_data.yml` continua disponível apenas via
`workflow_dispatch`, como alternativa manual.

---

## 🗺️ Escala Nacional (5.571 Municípios)

* A lista de códigos IBGE e a população são baixadas das APIs do IBGE
  (`/api/v1/localidades/municipios` e Agregado 4714 do Censo 2022).
* O pipeline usa `httpx` com pool de conexões e um rate limiter global
  (`--rate`, padrão 4 req/s) — acima disso o SICONFI começa a responder com
  *timeout*/429.
* Cada município consome até 6 requisições: RREO Anexos 01 e 02 (ano corrente,
  uma resposta só), RGF Anexo 01 e DCA Anexo I-E de 2021–2024, com fallback
  para as versões "Simplificado" usadas por municípios pequenos.
* A primeira execução (cache vazio) leva ~3h; as seguintes rodam em minutos,
  porque só os relatórios novos ou faltantes são baixados.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Dados públicos abertos fornecidos pela Secretaria do Tesouro Nacional (SICONFI) e Instituto Brasileiro de Geografia e Estatística (IBGE).
