import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-[#1B2A5E]">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
