import { ReactNode } from "react";
import PlainLanguageBadge from "./PlainLanguageBadge";

interface Props {
  title: string;
  citizenTitle?: string;
  technicalTermKey?: string;
  value: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  badge?: ReactNode;
  children?: ReactNode;
}

export default function KpiCard({
  title,
  citizenTitle,
  technicalTermKey,
  value,
  secondaryValue,
  secondaryLabel,
  badge,
  children,
}: Props) {
  return (
    <div className="bg-white rounded-xl p-5 border border-[#e5e0d8] shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#f0ede6]">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-sans font-medium text-slate-700 text-xs sm:text-sm">
                {title}
              </h3>
              {technicalTermKey && (
                <PlainLanguageBadge termKey={technicalTermKey} variant="icon" />
              )}
            </div>
            {citizenTitle && (
              <span className="text-[11px] font-sans text-slate-500 block">
                {citizenTitle}
              </span>
            )}
          </div>
          {badge}
        </div>

        <div className="mt-3">
          <div className="text-xl sm:text-2xl font-bold text-civic-ink tracking-tight font-mono leading-tight whitespace-nowrap">
            {value}
          </div>
          {secondaryValue && (
            <div className="text-xs text-slate-500 mt-1 flex items-baseline gap-1">
              {secondaryLabel && <span>{secondaryLabel}:</span>}
              <span className="font-semibold text-slate-700 font-mono">
                {secondaryValue}
              </span>
            </div>
          )}
        </div>
      </div>

      {children && <div className="mt-3 pt-3 border-t border-[#f0ede6]">{children}</div>}
    </div>
  );
}
