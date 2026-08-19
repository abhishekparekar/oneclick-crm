import React from 'react';
import { ChevronRight } from 'lucide-react';

const PageHeader = ({ breadcrumbs = [], title, children, icon: Icon }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 p-3 sm:px-4 sm:py-3.5 rounded-2xl shadow-2xs mb-4 transition-all">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center space-x-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                <span className={i === breadcrumbs.length - 1 ? "text-slate-700 dark:text-slate-300 font-bold" : "text-slate-400 dark:text-slate-500"}>{bc}</span>
                {i < breadcrumbs.length - 1 && <ChevronRight size={10} className="text-slate-300 dark:text-slate-600" />}
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={20} className="text-amber-500 shrink-0" />}
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:justify-end">
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
