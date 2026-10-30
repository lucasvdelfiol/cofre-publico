import { LRFInfo, LRFStatus } from "./types";

export interface CivicTerm {
  technical: string;
  citizen: string;
  shortDescription: string;
  fullExplanation: string;
  category: "receita" | "despesa" | "lrf" | "constitucional";
  practicalExample?: string;
}

export const CIVIC_DICTIONARY: Record<string, CivicTerm> = {
  dotacao_atualizada: {
    technical: "Dotação Atualizada",
    citizen: "Orçamento Planejado",
    shortDescription: "O valor máximo autorizado por lei para ser gasto no ano.",
    fullExplanation:
      "É o limite financeiro autorizado pela Câmara Municipal (na LOA - Lei Orçamentária Anual) somado aos créditos adicionais abertos durante o ano. Não significa que o dinheiro já existe na conta, mas sim o limite permitido para gastar.",
    category: "despesa",
    practicalExample: "Equivale ao limite de crédito mensal estipulado no orçamento da sua família.",
  },
  despesa_empenhada: {
    technical: "Despesa Empenhada",
    citizen: "Gasto Reservado / Contratado",
    shortDescription: "Recurso 'carimbado' para honrar um contrato ou compra já fechada.",
    fullExplanation:
      "É o primeiro estágio do gasto público: a prefeitura emite uma 'Nota de Empenho' prometendo pagar ao fornecedor assim que a obra for executada ou o produto entregue. Esse valor sai do saldo livre e fica bloqueado.",
    category: "despesa",
    practicalExample: "Como contratar um pedreiro: você separa o dinheiro na conta, mas só entrega depois que o muro estiver pronto.",
  },
  despesa_liquidada: {
    technical: "Despesa Liquidada / Paga",
    citizen: "Gasto Efetivamente Entregue e Pago",
    shortDescription: "Comprovação de que o serviço foi entregue e o dinheiro foi debitado.",
    fullExplanation:
      "A liquidação ocorre quando fiscais da prefeitura atestam que a escola recebeu a merenda ou a rua foi pavimentada (com nota fiscal verificada). Em seguida, vem o pagamento via ordem bancária ao fornecedor.",
    category: "despesa",
    practicalExample: "Você recebeu a mercadoria em casa com a nota fiscal e fez o PIX para a loja.",
  },
  restos_a_pagar: {
    technical: "Restos a Pagar",
    citizen: "Contas Pendentes de Anos Anteriores",
    shortDescription: "Despesas contratadas num ano anterior mas que ainda não foram pagas.",
    fullExplanation:
      "São compromissos assumidos até 31 de dezembro de um ano fiscal mas que rolaram para serem quitados no exercício seguinte. Podem ser despesas processadas (obra pronta esperando pagamento) ou não-processadas.",
    category: "despesa",
    practicalExample: "A fatura do cartão de crédito de dezembro que você só vai quitar em janeiro ou fevereiro.",
  },
  receita_corrente_liquida: {
    technical: "Receita Corrente Líquida (RCL)",
    citizen: "Arrecadação Livre Disponível",
    shortDescription: "O dinheiro real que a prefeitura arrecada para manter a máquina pública.",
    fullExplanation:
      "É a soma de todos os impostos municipais (IPTU, ISS, ITBI), taxas e repasses constitucionais (FPM, ICMS, IPVA) nos últimos 12 meses, descontando repasses obrigatórios ao Fundeb e previdência. É a régua que a Lei de Responsabilidade Fiscal usa.",
    category: "receita",
    practicalExample: "O salário líquido do cidadão, após descontar o INSS e impostos na fonte.",
  },
  autonomia_fiscal: {
    technical: "Grau de Dependência / Autonomia",
    citizen: "Índice de Autonomia Financeira",
    shortDescription: "Quanto a cidade gera com esforço próprio versus quanto depende de Brasília e do Estado.",
    fullExplanation:
      "Mede a proporção entre a arrecadação própria (impostos locais como IPTU e ISS) e os repasses externos (Fundo de Participação dos Municípios e cota-parte do ICMS). Municípios com alta dependência ficam vulneráveis a oscilações da economia nacional.",
    category: "receita",
  },
  minimo_educacao: {
    technical: "Mínimo Constitucional de Educação (Art. 212 da CF/88)",
    citizen: "Piso Obrigatório de Educação (25%)",
    shortDescription: "A Constituição exige que no mínimo 25% da receita vá para o ensino.",
    fullExplanation:
      "O artigo 212 da Constituição Federal de 1988 determina que os municípios devem aplicar, anualmente, nunca menos de 25% da receita resultante de impostos e transferências na manutenção e desenvolvimento do ensino infantil e fundamental.",
    category: "constitucional",
  },
  minimo_saude: {
    technical: "Mínimo Constitucional de Saúde (LC 141/2012)",
    citizen: "Piso Obrigatório de Saúde (15%)",
    shortDescription: "A Lei Complementar 141 exige que no mínimo 15% da receita vá para o SUS municipal.",
    fullExplanation:
      "Municípios são obrigados por lei federal a destinar no mínimo 15% de sua arrecadação de impostos em Ações e Serviços Públicos de Saúde (ASPS), garantindo postos de saúde, vacinação, agentes comunitários e UPAs.",
    category: "constitucional",
  },
};

export function getLRFStatus(percentage: number): LRFInfo {
  if (percentage < 48.6) {
    return {
      status: "normal",
      label: "Normal",
      description: "Folha de pagamento sob controle, bem abaixo do teto da Lei de Responsabilidade Fiscal.",
      color: "#22c55e",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      textColor: "text-emerald-500",
    };
  } else if (percentage <= 51.3) {
    return {
      status: "alerta",
      label: "Alerta LRF (48,6% a 51,3%)",
      description: "Tribunal de Contas notifica a prefeitura. Indicador exige contenção de novas contratações.",
      color: "#eab308",
      bgLight: "bg-amber-500/10",
      border: "border-amber-500/30",
      textColor: "text-amber-500",
    };
  } else if (percentage <= 54.0) {
    return {
      status: "prudencial",
      label: "Limite Prudencial (51,3% a 54,0%)",
      description: "Prefeitura proibida por lei de conceder reajustes, criar cargos, fazer horas extras ou novas nomeações.",
      color: "#f97316",
      bgLight: "bg-orange-500/10",
      border: "border-orange-500/30",
      textColor: "text-orange-500",
    };
  } else {
    return {
      status: "critico",
      label: "Crítico / Ilegal (> 54,0%)",
      description: "Infração à LRF. Risco de rejeição de contas, perda de transferências voluntárias e improbidade.",
      color: "#ef4444",
      bgLight: "bg-red-500/10",
      border: "border-red-500/30",
      textColor: "text-red-500",
    };
  }
}

export function formatBRL(value: number, compact: boolean = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `R$ ${(value / 1_000_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} bi`;
    }
    if (Math.abs(value) >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} mi`;
    }
    if (Math.abs(value) >= 1_000) {
      return `R$ ${(value / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
    }
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(val: number): string {
  return val.toLocaleString("pt-BR");
}

export function formatPct(val: number): string {
  return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
