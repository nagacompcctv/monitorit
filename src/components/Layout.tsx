import React from 'react';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  );
}

export function SectionHeader({ title, description, badge }: { title: string; description?: string; badge?: string }) {
  return (
    <div className="mb-12">
      {badge && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-blue-600 uppercase">
            {badge}
          </span>
        </div>
      )}
      <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h2>
      {description && <p className="mt-2 text-gray-400 text-xs font-medium max-w-2xl">{description}</p>}
    </div>
  );
}

export function Card({ children, className, title, ...props }: { children: React.ReactNode; className?: string; title?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={("bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden " + (className || ""))} {...props}>
      {title && (
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
          <div className="w-1 h-4 bg-blue-600" />
          <h3 className="text-sm font-bold text-gray-900 uppercase">{title}</h3>
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}
