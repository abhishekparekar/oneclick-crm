import React from 'react';

interface StatusBadgeProps {
  name: string;
  color?: string;
}

export const getLeadStatusColorStyle = (statusName: string, customColor?: string) => {
  const s = String(statusName || "new").toLowerCase().trim();

  if (s.includes("won") || s.includes("convert") || s.includes("close") || s.includes("deal") || s.includes("success")) {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-800/80",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
      pillInactive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/80 shadow-2xs",
      pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30",
      badgeInactive: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200",
      badgeActive: "bg-white/20 text-white",
    };
  }
  if (s.includes("lost") || s.includes("drop") || s.includes("reject") || s.includes("cancel") || s.includes("fail")) {
    return {
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-200 dark:border-rose-800/80",
      text: "text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
      pillInactive: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100/80 shadow-2xs",
      pillActive: "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30",
      badgeInactive: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200",
      badgeActive: "bg-white/20 text-white",
    };
  }
  if (s.includes("qualif") || s.includes("proposal") || s.includes("negotiat") || s.includes("progress") || s.includes("process") || s.includes("follow") || s.includes("working")) {
    return {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-200 dark:border-amber-800/80",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
      pillInactive: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100/80 shadow-2xs",
      pillActive: "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30",
      badgeInactive: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200",
      badgeActive: "bg-white/20 text-white",
    };
  }
  if (s.includes("contact") || s.includes("call") || s.includes("reach") || s.includes("touch")) {
    return {
      bg: "bg-teal-50 dark:bg-teal-950/40",
      border: "border-teal-200 dark:border-teal-800/80",
      text: "text-teal-700 dark:text-teal-300",
      dot: "bg-teal-500",
      pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs",
      pillActive: "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/30",
      badgeInactive: "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200",
      badgeActive: "bg-white/20 text-white",
    };
  }
  return {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/80",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    pillInactive: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100/80 shadow-2xs",
    pillActive: "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30",
    badgeInactive: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200",
    badgeActive: "bg-white/20 text-white",
  };
};

export default function StatusBadge({ name, color }: StatusBadgeProps) {
  const style = getLeadStatusColorStyle(name, color);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shadow-2xs select-none ${style.bg} ${style.border} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{name || "New"}</span>
    </span>
  );
}

