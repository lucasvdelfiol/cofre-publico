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
    <div className="group relative flex flex-col justify-between border border-ink-600 bg-ink-850 p-5 transition-colors hover:border-ink-500">
      <span className="absolute left-0 top-0 h-[2px] w-10 bg-acid" />
      <div>
        <div className="flex items-start justify-between gap-2 border-b border-ink-600 pb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-mono text-[10px] uppercase tracking-label text-bone-500">
                {title}
              </h3>
              {technicalTermKey && (
                <PlainLanguageBadge termKey={technicalTermKey} variant="icon" />
              )}
            </div>
            {citizenTitle && (
              <span className="mt-1 block text-[11px] leading-snug text-bone-400">
                {citizenTitle}
              </span>
            )}
          </div>
          {badge}
        </div>

        <div className="mt-4">
          <div className="font-mono text-xl font-semibold leading-none tracking-tight text-bone-50 sm:text-2xl">
            {value}
          </div>
          {secondaryValue && (
            <div className="mt-2 flex items-baseline gap-1 text-[11px] text-bone-500">
              {secondaryLabel && <span>{secondaryLabel}:</span>}
              <span className="font-mono font-semibold text-bone-300">
                {secondaryValue}
              </span>
            </div>
          )}
        </div>
      </div>

      {children && <div className="mt-4 border-t border-ink-600 pt-3">{children}</div>}
    </div>
  );
}
