# Orçamento Cidadão 🇧🇷

> **Plataforma cívica open-source e 100% gratuita** para exploração, normalização e visualização dos gastos públicos municipais de todas as cidades brasileiras, inspirada no design e usabilidade de plataformas como *Politicômetro*.

---

## 🏛️ Visão do Projeto

A contabilidade pública brasileira é riquíssima em dados abertos (via **SICONFI / Tesouro Nacional** e **IBGE**), mas é inacessível para a maioria dos cidadãos devido a jargões técnicos herméticos (*"Dotação Atualizada"*, *"Despesa Empenhada"*, *"Restos a Pagar"*, *"RCL"*).

O **Orçamento Cidadão** resolve esse desafio através de:
1. **Linguagem Cidadã:** Tradução automática e contextual de termos contábeis para o vocabulário cotidiano.
2. **Métricas Per Capita:** Comparações justas entre cidades de diferentes portes populacionais.
3. **Termômetro da LRF:** Visualização intuitiva da folha de pagamento em relação aos limites legais da Lei de Responsabilidade Fiscal.
4. **Arquitetura Zero-Cost (Jamstack):** Sem servidores backend ativos, sem bancos de dados pagos e sem custos recorrentes de hospedagem.

---

## ⚡ Arquitetura do Sistema (Zero-Cost / Jamstack)

```text
[APIs Públicas: SICONFI / IBGE / STN]
                 │
                 ▼  (Executado mensalmente no dia 5 via GitHub Actions: Python ETL)
   [Consolidação e Compressão de Dados]
         ├── public/data/cities/{ibge_code}.json   (5.570 arquivos estáticos ~5 KB)
         ├── public/data/cities_index.json          (Índice rápido para busca instantânea)
         └── public/data/brazil_summary.parquet     (~3 MB - Tabela nacional compactada)
                 │
                 ▼  (Commit automatizado no Git & Deploy Estático)
      [Cloudflare Pages / Vercel]
                 │
                 ▼  (Consultas analíticas em memória no navegador)
            [Aplicação Web Next.js (SSG)]
```

### Decisões de Engenharia
* **Orquestração:** Pipeline Python rodando dentro dos 2.000 minutos mensais gratuitos do **GitHub Actions**.
* **Armazenamento Estático:**
  * Arquivos JSON individuais por município (`public/data/cities/{ibge_code}.json`) para carregamento instantâneo sob demanda (<10 KB).
  * Arquivo Apache Parquet consolidado (`public/data/brazil_summary.parquet`) para permitir consultas SQL e rankings no cliente via **DuckDB-Wasm** sem onerar servidores.
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

# Executar extração SICONFI
python pipeline/extract_siconfi.py

# Ou gerar dados rápidos de semente offline:
python pipeline/extract_siconfi.py --skip-network
```

### 3. Gerar a Build Estática (SSG / Jamstack)
```bash
npm run build
```
O build estático pronto para deploy será gerado no diretório `out/`.

---

## 🤖 Automação Mensal (GitHub Actions)

O arquivo `.github/workflows/sync_data.yml` agenda a execução do pipeline todo dia 5 às 04:00 UTC:
1. Consulta dados fechados do SICONFI/Tesouro Nacional.
2. Atualiza os arquivos em `public/data/cities/` e o Parquet nacional.
3. Faz o commit das alterações automaticamente via bot caso haja novos dados.
4. Dispara o rebuild estático automático no Cloudflare Pages ou Vercel.

---

## 🗺️ Roadmap de Escala (5.570 Cidades)

Para expandir da amostra atual (10 cidades-chave) para todas as 5.570 cidades:
* A lista de códigos IBGE é baixada da API do IBGE (`/api/v1/localidades/municipios`).
* O pipeline executa requisições em lotes assíncronos (`httpx.AsyncClient` com rate limiter de ~10 req/s para respeitar as diretrizes do Tesouro Nacional).
* As execuções mensais demoram cerca de 20 minutos no GitHub Actions, mantendo o custo estritamente zerado.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Dados públicos abertos fornecidos pela Secretaria do Tesouro Nacional (SICONFI) e Instituto Brasileiro de Geografia e Estatística (IBGE).
