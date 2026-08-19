import { ChevronLeft, ChevronRight } from "lucide-react";

const DataTable = ({ columns, data, pagination }) => {
  const isSA = typeof window !== "undefined" && window.location.pathname.includes("/superadmin");

  const surfaceBg = isSA ? "bg-sa-surface dark:bg-[#140525]" : "bg-ca-surface";
  const borderCol = isSA ? "border-sa-border/30 border-ca-border" : "border-slate-200/80 border-ca-border";
  const headBg = isSA ? "bg-sa-bg dark:bg-[#1E0C35]" : "bg-ca-bg dark:bg-[#1E293B]";
  const headText = isSA ? "text-sa-text-secondary dark:text-slate-300" : "text-ca-text-secondary dark:text-slate-400";
  const rowHover = isSA ? "hover:bg-sa-primary/5 dark:hover:bg-white/5" : "hover:bg-slate-50/90 dark:hover:bg-ca-surface/[0.04]";
  const cellText = isSA ? "text-sa-text dark:text-slate-100" : "text-ca-text-secondary dark:text-slate-200";
  const divideCol = isSA ? "divide-sa-border/20 dark:divide-white/10" : "divide-slate-100/70 dark:divide-white/[0.06]";
  const footBorder = isSA ? "border-sa-border/30 border-ca-border" : "border-slate-100/50 border-ca-border";
  const footText = isSA ? "text-sa-text-secondary dark:text-slate-400" : "text-ca-text-secondary dark:text-slate-400";
  const footBold = isSA ? "text-sa-text " : "text-ca-text-secondary ";
  const btnPrevNext = isSA
    ? "border-sa-border/30 border-ca-border bg-sa-surface dark:bg-[#140525] text-sa-text-secondary dark:text-slate-300 hover:bg-sa-primary/10 hover:text-sa-primary"
    : "border-ca-border bg-ca-surface dark:bg-white/5 text-ca-text-secondary hover:bg-ca-hover";
  const btnActive = isSA
    ? "border-[#613DC1] bg-[#613DC1] text-white shadow-[0_0_12px_rgba(97,61,193,0.4)] dark:bg-[#613DC1] dark:border-[#613DC1] "
    : "border-ca-border bg-ca-bg dark:bg-primary text-ca-text  hover:bg-ca-hover";

  const headBorder = isSA
    ? "border-b border-sa-border/80 dark:border-white/20 shadow-[0_1px_0_0_rgba(70,17,119,0.6)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.15)]"
    : "border-b border-ca-border dark:border-white/20 shadow-[0_1px_0_0_rgba(203,213,225,1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.15)]";

  return (
    <div className={`${surfaceBg} !p-0 overflow-visible flex flex-col flex-1 border-0 rounded-none`}>
      <div className="overflow-x-auto overflow-y-visible flex-1 min-h-[360px] hide-scrollbar scroll-smooth [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className={`${headBg} text-[11.5px] font-extrabold ${headText} uppercase tracking-widest sticky top-0 z-20 shadow-xs`}>
            <tr className={headBorder}>
              {columns.map((col, idx) => (
                <th key={idx} className={`py-3.5 px-5 select-none sticky top-0 z-20 ${headBg} ${headBorder} ${idx === 0 ? 'rounded-tl-2xl' : ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-0 border-0">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`py-14 text-center ${headText}`}>
                  <div className="flex flex-col items-center justify-center">
                    <p className={`font-bold mt-2 ${cellText} text-base`}>No records found</p>
                    <p className="text-sm text-ca-text-secondary dark:text-slate-500 mt-1">There are no entries matching your current filters or search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className={`${rowHover} transition-colors group border-0`}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={`py-3 px-5 align-middle text-sm ${cellText} border-0`}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {pagination && (
        <div className={`${surfaceBg} px-6 py-4 border-t ${footBorder} flex items-center justify-between sm:px-6`}>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className={`text-base ${footText}`}>
                Showing <span className={`font-bold ${footBold}`}>1</span> to <span className={`font-bold ${footBold}`}>{data.length}</span> of <span className={`font-bold ${footBold}`}>{pagination.total || data.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                <button className={`relative inline-flex items-center px-2 py-2 rounded-l-lg border ${btnPrevNext} transition-colors`}>
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button className={`relative inline-flex items-center px-4 py-2 border ${btnActive} text-base font-bold transition-colors z-10`}>
                  1
                </button>
                <button className={`relative inline-flex items-center px-2 py-2 rounded-r-lg border ${btnPrevNext} transition-colors`}>
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
