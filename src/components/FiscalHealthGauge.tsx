"use client";

import { getLRFStatus, formatPct } from "@/lib/civicDictionary";
import PlainLanguageBadge from "./PlainLanguageBadge";

interface Props {
  percentage: number;
}

export default function FiscalHealthGauge({ percentage }: Props) {
  const lrf = getLRFStatus(percentage);

  // Range from 30% to 60%
  const minRange = 30.0;
  const maxRange = 60.0;
  const clamped = Math.max(minRange, Math.min(percentage, maxRange));
  const currentPosPct = ((clamped - minRange) / (maxRange - minRange)) * 100;

  // Key legal marker positions
  const alertPosPct = ((48.6 - minRange) / (maxRange - minRange)) * 100;
  const prudentialPosPct = ((51.3 - minRange) / (maxRange - minRange)) * 100;
  const maxPosPct = ((54.0 - minRange) / (maxRange - minRange)) * 100;

  return (
    <div className="bg-ink-850 rounded-xl p-6 border border-[#252b23] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-4 border-b border-[#252b23] gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-serif font-bold text-bone-100 text-base">
              Termômetro da Folha de Pessoal (LRF)
            </h3>
            <PlainLanguageBadge termKey="receita_corrente_liquida" variant="icon" />
          </div>
          <p className="text-xs text-bone-400 mt-0.5">
            Percentual gasto com salários sobre a Arrecadação Livre Disponível (RCL)
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-bone-100">
            {formatPct(percentage)}
          </div>
          <span
            className="inline-block text-xs font-semibold px-2 py-0.5 rounded mt-0.5"
            style={{ backgroundColor: lrf.bgLight ? undefined : "#252b23", color: lrf.color }}
          >
            {lrf.label}
          </span>
        </div>
      </div>

      {/* Linear Fiscal Meter with Legal Thresholds */}
      <div className="pt-6 pb-4">
        <div className="relative">
          {/* Main Track */}
          <div className="h-3 bg-ink-700 overflow-hidden flex relative">
            {/* Safe zone: up to 48.6% */}
            <div
              className="bg-[#8ce99a]/80 h-full"
              style={{ width: `${alertPosPct}%` }}
              title="Faixa Normal: abaixo de 48,6%"
            />
            {/* Alert zone: 48.6% to 51.3% */}
            <div
              className="bg-[#f5c451]/80 h-full"
              style={{ width: `${prudentialPosPct - alertPosPct}%` }}
              title="Faixa de Alerta: 48,6% a 51,3%"
            />
            {/* Prudential zone: 51.3% to 54.0% */}
            <div
              className="bg-[#ff7a4d]/80 h-full"
              style={{ width: `${maxPosPct - prudentialPosPct}%` }}
              title="Faixa Prudencial: 51,3% a 54,0%"
            />
            {/* Critical zone: above 54.0% */}
            <div
              className="bg-[#ff5c5c]/80 h-full flex-1"
              title="Faixa Crítica (Ilegal): acima de 54,0%"
            />
          </div>

          {/* Current Needle / Pin */}
          <div
            className="absolute -top-1.5 -bottom-1.5 w-1 bg-acid z-10 transition-all duration-300"
            style={{ left: `${currentPosPct}%` }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-acid rotate-45" />
          </div>
        </div>

        {/* Ticks and Legal Labels */}
        <div className="relative h-10 mt-2 text-[11px] font-mono text-bone-400">
          <div
            className="absolute top-1 -translate-x-1/2 text-center"
            style={{ left: `${alertPosPct}%` }}
          >
            <span className="block border-l border-ink-500 h-2 mx-auto" />
            <span className="font-semibold text-bone-200">48,6%</span>
            <span className="text-[10px] text-bone-500 block font-sans">Alerta</span>
          </div>

          <div
            className="absolute top-1 -translate-x-1/2 text-center"
            style={{ left: `${prudentialPosPct}%` }}
          >
            <span className="block border-l border-ink-500 h-2 mx-auto" />
            <span className="font-semibold text-bone-200">51,3%</span>
            <span className="text-[10px] text-bone-500 block font-sans">Prudencial</span>
          </div>

          <div
            className="absolute top-1 -translate-x-1/2 text-center"
            style={{ left: `${maxPosPct}%` }}
          >
            <span className="block border-l border-[#ff5c5c] h-2 mx-auto" />
            <span className="font-bold text-[#ff8f78]">54,0%</span>
            <span className="text-[10px] text-[#ff7a6a] block font-sans">Teto LRF</span>
          </div>
        </div>
      </div>

      {/* Diagnostic Note */}
      <div className="mt-4 p-3.5 bg-[#0f120f] border border-[#252b23] rounded-lg text-xs leading-relaxed text-bone-300">
        <strong className="text-bone-100 font-semibold block mb-0.5">
          Diagnóstico Legal da Lei de Responsabilidade Fiscal:
        </strong>
        {lrf.description}
      </div>

      {percentage > 100 && (
        <div className="mt-3 p-3.5 bg-gold/10 border border-gold/30 rounded-lg text-xs leading-relaxed text-bone-100">
          <strong className="block mb-0.5">Atenção: valor acima de 100% da RCL</strong>
          O percentual de {formatPct(percentage)} foi declarado pelo próprio município no
          RGF enviado ao SICONFI. Valores acima de 100% indicam, quase sempre, erro no
          preenchimento do relatório (RCL subdeclarada), e não gasto real de mais de uma
          arrecadação inteira com pessoal. Trate este indicador com cautela.
        </div>
      )}
    </div>
  );
}
