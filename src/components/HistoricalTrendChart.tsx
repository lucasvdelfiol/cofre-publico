"use client";

import { useState } from "react";
import { HistoricalTrendItem } from "@/lib/types";
import { formatBRL } from "@/lib/civicDictionary";

interface Props {
  trend: HistoricalTrendItem[];
  cityName: string;
}

export default function HistoricalTrendChart({ trend, cityName }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!trend || trend.length === 0) return null;

  const maxTotal = Math.max(...trend.map((t) => t.total_spent_per_capita)) * 1.15;
  const minTotal = Math.min(...trend.map((t) => t.health_per_capita)) * 0.7;
  const range = maxTotal - minTotal || 1;

  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (idx: number) =>
    trend.length === 1
      ? padding.left + chartW / 2
      : padding.left + (idx / (trend.length - 1)) * chartW;
  const getY = (val: number) =>
    padding.top + chartH - ((val - minTotal) / range) * chartH;

  const totalPoints = trend.map((t, i) => `${getX(i)},${getY(t.total_spent_per_capita)}`).join(" ");
  const healthPoints = trend.map((t, i) => `${getX(i)},${getY(t.health_per_capita)}`).join(" ");

  const firstYear = trend[0];
  const lastYear = trend[trend.length - 1];
  const growthPct = (
    firstYear.total_spent_per_capita > 0
      ? ((lastYear.total_spent_per_capita - firstYear.total_spent_per_capita) /
          firstYear.total_spent_per_capita) *
        100
      : 0
  ).toFixed(1);

  return (
    <div className="bg-ink-850 rounded-xl p-6 border border-[#252b23] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-4 border-b border-[#252b23] gap-2">
        <div>
          <h3 className="font-serif font-bold text-bone-100 text-base sm:text-lg">
            Série Histórica por Habitante ({firstYear.year}–{lastYear.year})
          </h3>
          <p className="text-xs text-bone-400 mt-0.5">
            Crescimento nominal acumulado de {growthPct}% no período para {cityName}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-acid inline-block" />
            <span className="text-bone-200">Gasto Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8ce99a] inline-block" />
            <span className="text-bone-200">Saúde Pública</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-64 overflow-visible">
          {/* Subtle horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = padding.top + chartH * pct;
            const val = maxTotal - pct * (maxTotal - minTotal);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#252b23"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-bone-500 font-mono"
                >
                  {formatBRL(val, true)}
                </text>
              </g>
            );
          })}

          {/* Total Line */}
          <polyline
            points={totalPoints}
            fill="none"
            stroke="#d8f45c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Health Line */}
          <polyline
            points={healthPoints}
            fill="none"
            stroke="#8ce99a"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {trend.map((item, idx) => {
            const x = getX(idx);
            const yTotal = getY(item.total_spent_per_capita);
            const yHealth = getY(item.health_per_capita);
            const isHovered = activeIdx === idx;

            return (
              <g
                key={item.year}
                className="cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <text
                  x={x}
                  y={padding.top + chartH + 18}
                  textAnchor="middle"
                  className={`text-xs font-mono ${
                    isHovered ? "fill-acid font-bold" : "fill-bone-400"
                  }`}
                >
                  {item.year}
                </text>

                <circle
                  cx={x}
                  cy={yTotal}
                  r={isHovered ? 5 : 3.5}
                  fill="#0b0d0b"
                  stroke="#d8f45c"
                  strokeWidth="2"
                />

                <circle
                  cx={x}
                  cy={yHealth}
                  r={isHovered ? 4.5 : 3}
                  fill="#0b0d0b"
                  stroke="#8ce99a"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>

        {activeIdx !== null && (
          <div className="mt-3 p-3 bg-[#151a15] rounded border border-[#252b23] text-xs flex items-center justify-between font-mono">
            <span className="font-bold text-bone-100">
              Ano {trend[activeIdx].year}:
            </span>
            <div className="flex gap-4">
              <span>Gasto Total: {formatBRL(trend[activeIdx].total_spent_per_capita)}/hab</span>
              <span className="text-[#8ce99a]">Saúde: {formatBRL(trend[activeIdx].health_per_capita)}/hab</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
