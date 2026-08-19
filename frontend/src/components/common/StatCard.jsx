import React from "react";
import { useLocation } from "react-router-dom";

const StatCard = ({ title, value, icon: Icon, trendValue, color, iconColor, bgColor }) => {
  const location = useLocation();
  const isSA = location.pathname.startsWith("/superadmin") || location.pathname.startsWith("/manager");

  return (
    <div className={`rounded-xl px-4 py-3.5 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
      isSA 
        ? "bg-sa-surface border-sa-border shadow-sm hover:border-sa-primary/60" 
        : "bg-ca-surface dark:bg-slate-900 border-slate-200/80 border-ca-border shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md"
    }`}>
      {/* Top row: Title on left, Icon on right */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className={`text-[11.5px] font-bold uppercase tracking-wider leading-tight truncate ${
          isSA ? "text-sa-text-secondary" : "text-ca-text-secondary dark:text-slate-400"
        }`}>
          {title}
        </p>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            bgColor || (isSA ? "bg-sa-primary/15" : "bg-ca-bg dark:bg-white/10")
          }`}>
            <Icon size={14} className={iconColor || (isSA ? "text-sa-accent" : "text-ca-text-secondary dark:text-slate-300")} />
          </div>
        )}
      </div>

      {/* Bottom row: Large Number on left, Trend/Badge on right */}
      <div className="flex items-baseline justify-between pt-0.5 gap-2">
        <h3 className={`text-2xl font-black tracking-tight leading-none ${
          isSA ? "text-sa-text" : "text-ca-text "
        }`}>
          {value ?? "0"}
        </h3>
        {trendValue && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center whitespace-nowrap ${
            isSA
              ? trendValue.includes('+') || trendValue.includes('75%')
                ? "text-sa-text bg-sa-success-bg"
                : trendValue.includes('Action') || trendValue.includes('Required') || trendValue.includes('-')
                  ? "text-sa-text bg-sa-warning-bg"
                  : "text-sa-text bg-sa-primary/20"
              : trendValue.includes('+') || trendValue.includes('75%')
                ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10"
                : trendValue.includes('Action') || trendValue.includes('Required') || trendValue.includes('-')
                  ? "text-amber-700 dark:text-amber-400 bg-ca-primary-light dark:bg-amber-500/10"
                  : "text-blue-700 dark:text-blue-400 bg-ca-bg dark:bg-blue-500/10"
          }`}>
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
